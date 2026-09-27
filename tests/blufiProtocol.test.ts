import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { calculateCRC16 } from '../src/lib/encriptutil.ts';
import {
  BLUFI_FC_FRAGMENT,
  BlufiSession,
  BlufiWiFiListAssembler,
  decodeBlufiFrame,
  encodeBlufiFrame,
  getWiFiReportState,
  parseDeviceNameFromAdvertisement,
} from '../src/services/blufiProtocol.ts';

const bytes = (...values: number[]) => new Uint8Array(values);
const commitFrame = (session: BlufiSession, type: number, data = bytes()) => {
  const frame = session.createFrame(type, data);
  session.commit(frame[2]);
  return frame;
};

describe('BLUFI checksum and codec', () => {
  it('matches the firmware CRC-16/XMODEM golden vectors and writes LE', () => {
    assert.equal(calculateCRC16(new TextEncoder().encode('123456789')), 0x31c3);
    assert.equal(calculateCRC16(bytes(0, 0)), 0);
    const golden = calculateCRC16(new TextEncoder().encode('123456789'));
    assert.deepEqual([golden & 0xff, golden >>> 8], [0xc3, 0x31]);
  });

  it('encodes and strictly decodes frames', () => {
    const encoded = encodeBlufiFrame(0x24, 7);
    assert.deepEqual(Array.from(encoded), [0x24, 0x02, 7, 0, 0x97, 0x99]);
    assert.equal(decodeBlufiFrame(encoded).type, 0x24);
    assert.equal(decodeBlufiFrame(encoded).sequence, 7);
    const badCrc = encoded.slice();
    badCrc[4] ^= 1;
    assert.throws(() => decodeBlufiFrame(badCrc), /CRC mismatch/);
    assert.throws(() => decodeBlufiFrame(encoded.slice(0, -1)), /length mismatch/);
    assert.throws(() => decodeBlufiFrame(bytes(...encoded, 0)), /length mismatch/);
  });

  it('honors DataView byteOffset and byteLength', () => {
    const frame = encodeBlufiFrame(0x24, 3);
    const storage = bytes(0xaa, 0xbb, ...frame, 0xcc);
    const decoded = decodeBlufiFrame(new DataView(storage.buffer, 2, frame.length));
    assert.equal(decoded.sequence, 3);
    assert.deepEqual(decoded.raw, frame);
  });
});

describe('BLUFI uplink session', () => {
  it('commits sequence only after a successful send and wraps at 255', () => {
    const session = new BlufiSession(255);
    assert.equal(session.createFrame(0x24)[2], 255);
    assert.equal(session.createFrame(0x24)[2], 255);
    session.commit(255);
    assert.equal(session.createFrame(0x24)[2], 0);
  });

  it('invalidates the session after a transport write failure', async () => {
    const session = new BlufiSession();
    await assert.rejects(session.send(0x24, bytes(), async () => { throw new Error('write failed'); }), /write failed/);
    assert.throws(() => session.createFrame(0x24), /invalid/);
  });

  it('uses dynamic sequences for one scan followed by configuration', () => {
    const session = new BlufiSession();
    const frames = [
      commitFrame(session, 0x24),
      commitFrame(session, 0x04, bytes(1)),
      commitFrame(session, 0x09, new TextEncoder().encode('ssid')),
      commitFrame(session, 0x0d, new TextEncoder().encode('password')),
      commitFrame(session, 0x0c),
    ];
    assert.deepEqual(frames.map((frame) => frame[0]), [0x24, 0x04, 0x09, 0x0d, 0x0c]);
    assert.deepEqual(frames.map((frame) => frame[2]), [0, 1, 2, 3, 4]);
    assert.ok(frames.every((frame) => frame[1] === 0x02));
  });
});

describe('BLUFI Wi-Fi list', () => {
  const payload = bytes(3, 0xd8, 0x41, 0x50, 5, 0xc4, 0x48, 0x6f, 0x6d, 0x65);

  it('parses a single frame and keeps the strongest duplicate', () => {
    const assembler = new BlufiWiFiListAssembler();
    const duplicate = bytes(...payload, 3, 0xec, 0x41, 0x50);
    const result = assembler.push(decodeBlufiFrame(encodeBlufiFrame(0x45, 10, duplicate, 0x04)));
    assert.deepEqual(result, [{ name: 'AP', strength: -20 }, { name: 'Home', strength: -60 }]);
  });

  it('reassembles ESP-IDF remaining-length fragments with consecutive sequences', () => {
    const assembler = new BlufiWiFiListAssembler();
    const firstData = bytes(payload.length, 0, ...payload.slice(0, 4));
    assert.equal(assembler.push(decodeBlufiFrame(encodeBlufiFrame(0x45, 20, firstData, 0x04 | BLUFI_FC_FRAGMENT))), null);
    const result = assembler.push(decodeBlufiFrame(encodeBlufiFrame(0x45, 21, payload.slice(4), 0x04)));
    assert.deepEqual(result?.map((network) => network.name), ['AP', 'Home']);
  });

  it('rejects out-of-order and inconsistent fragments', () => {
    const assembler = new BlufiWiFiListAssembler();
    assembler.push(decodeBlufiFrame(encodeBlufiFrame(0x45, 1, bytes(payload.length, 0, ...payload.slice(0, 3)), 0x14)));
    assert.throws(() => assembler.push(decodeBlufiFrame(encodeBlufiFrame(0x45, 3, payload.slice(3), 0x04))), /sequence mismatch/);
    const badLength = new BlufiWiFiListAssembler();
    assert.throws(() => badLength.push(decodeBlufiFrame(encodeBlufiFrame(0x45, 1, bytes(2, 0, 1, 2), 0x14))), /final\/oversized/);
  });
});

describe('BLUFI provisioning reports and identity', () => {
  for (const [state, expected] of [[0, 'success'], [1, 'failure'], [2, 'progress'], [3, 'progress']] as const) {
    it(`maps 0x3D state ${state} to ${expected}`, () => {
      const frame = decodeBlufiFrame(encodeBlufiFrame(0x3d, 1, bytes(1, state, 0), 0x04));
      assert.equal(getWiFiReportState(frame), expected);
    });
  }

  it('never treats 0x49 as a connection report or ACK', () => {
    const error = decodeBlufiFrame(encodeBlufiFrame(0x49, 2, bytes(5), 0x04));
    assert.equal(error.type, 0x49);
    assert.throws(() => getWiFiReportState(error), /Invalid/);
  });

  it('extracts DeviceName only after the final hyphen', () => {
    assert.equal(parseDeviceNameFromAdvertisement('AIO-P_Cup_00000020'), 'P_Cup_00000020');
    assert.equal(parseDeviceNameFromAdvertisement('P_Cup_00000020'), 'P_Cup_00000020');
    assert.equal(parseDeviceNameFromAdvertisement('vendor-P_Cup_00000020'), 'P_Cup_00000020');
  });

});
