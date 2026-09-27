import { calculateCRC16 } from '../lib/encriptutil.ts';

export const BLUFI_FC_CHECKSUM = 0x02;
export const BLUFI_FC_FRAGMENT = 0x10;

export type BlufiByteSource = Uint8Array | DataView | ArrayBuffer;

export interface BlufiFrame {
  type: number;
  frameControl: number;
  sequence: number;
  data: Uint8Array;
  raw: Uint8Array;
}

export interface BlufiWiFiNetwork {
  name: string;
  strength: number;
}

function bytesFrom(source: BlufiByteSource): Uint8Array {
  if (source instanceof Uint8Array) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }
  if (source instanceof DataView) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
  }
  return new Uint8Array(source);
}

export function encodeBlufiFrame(
  type: number,
  sequence: number,
  data: Uint8Array = new Uint8Array(0),
  frameControl: number = BLUFI_FC_CHECKSUM,
): Uint8Array {
  if (!Number.isInteger(type) || type < 0 || type > 0xff) throw new Error('BLUFI type must be one byte');
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xff) throw new Error('BLUFI sequence must be one byte');
  if (data.byteLength > 0xff) throw new Error('BLUFI payload exceeds 255 bytes');

  const checksumLength = (frameControl & BLUFI_FC_CHECKSUM) !== 0 ? 2 : 0;
  const frame = new Uint8Array(4 + data.byteLength + checksumLength);
  frame.set([type, frameControl, sequence, data.byteLength]);
  frame.set(data, 4);
  if (checksumLength) {
    const checksum = calculateCRC16(frame.subarray(2, 4 + data.byteLength));
    frame[4 + data.byteLength] = checksum & 0xff;
    frame[5 + data.byteLength] = checksum >>> 8;
  }
  return frame;
}

export function decodeBlufiFrame(source: BlufiByteSource): BlufiFrame {
  const view = bytesFrom(source);
  if (view.byteLength < 4) throw new Error(`BLUFI frame too short: ${view.byteLength}`);

  const frameControl = view[1];
  const dataLength = view[3];
  const checksumLength = (frameControl & BLUFI_FC_CHECKSUM) !== 0 ? 2 : 0;
  const expectedLength = 4 + dataLength + checksumLength;
  if (view.byteLength !== expectedLength) {
    throw new Error(`BLUFI frame length mismatch: expected ${expectedLength}, received ${view.byteLength}`);
  }
  if (checksumLength) {
    const expected = calculateCRC16(view.subarray(2, 4 + dataLength));
    const received = view[4 + dataLength] | (view[5 + dataLength] << 8);
    if (received !== expected) {
      throw new Error(`BLUFI CRC mismatch: expected 0x${expected.toString(16).padStart(4, '0')}, received 0x${received.toString(16).padStart(4, '0')}`);
    }
  }

  return {
    type: view[0],
    frameControl,
    sequence: view[2],
    data: view.slice(4, 4 + dataLength),
    raw: view.slice(),
  };
}

export class BlufiSession {
  private nextUplinkSequence: number;
  private valid = true;

  constructor(initialSequence = 0) {
    this.nextUplinkSequence = initialSequence & 0xff;
  }

  get nextSequence(): number {
    return this.nextUplinkSequence;
  }

  createFrame(type: number, data: Uint8Array = new Uint8Array(0)): Uint8Array {
    if (!this.valid) throw new Error('BLUFI session is invalid and must be reconnected');
    return encodeBlufiFrame(type, this.nextUplinkSequence, data, BLUFI_FC_CHECKSUM);
  }

  commit(sequence: number): void {
    if (sequence !== this.nextUplinkSequence) throw new Error('Cannot commit a stale BLUFI sequence');
    this.nextUplinkSequence = (this.nextUplinkSequence + 1) & 0xff;
  }

  async send(
    type: number,
    data: Uint8Array,
    write: (frame: Uint8Array) => Promise<void>,
  ): Promise<Uint8Array> {
    const frame = this.createFrame(type, data);
    try {
      await write(frame);
      this.commit(frame[2]);
      return frame;
    } catch (error) {
      this.valid = false;
      throw error;
    }
  }
}

export function parseBlufiWiFiList(payload: Uint8Array): BlufiWiFiNetwork[] {
  const strongestBySsid = new Map<string, BlufiWiFiNetwork>();
  let offset = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  while (offset < payload.length) {
    const entryLength = payload[offset++];
    if (entryLength < 2 || entryLength > 33) throw new Error(`Invalid BLUFI AP entry length: ${entryLength}`);
    if (offset + entryLength > payload.length) throw new Error('Truncated BLUFI AP entry');
    const rawRssi = payload[offset++];
    const strength = rawRssi > 127 ? rawRssi - 256 : rawRssi;
    const ssidBytes = payload.slice(offset, offset + entryLength - 1);
    offset += entryLength - 1;
    if (ssidBytes.length < 1 || ssidBytes.length > 32) throw new Error('Invalid BLUFI SSID length');
    const name = decoder.decode(ssidBytes);
    if (!name || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('BLUFI SSID contains unsupported control characters');
    const previous = strongestBySsid.get(name);
    if (!previous || strength > previous.strength) strongestBySsid.set(name, { name, strength });
  }
  return Array.from(strongestBySsid.values()).sort((a, b) => b.strength - a.strength);
}

export class BlufiWiFiListAssembler {
  private chunks: Uint8Array[] = [];
  private totalLength: number | undefined;
  private receivedLength = 0;
  private previousSequence: number | undefined;

  reset(): void {
    this.chunks = [];
    this.totalLength = undefined;
    this.receivedLength = 0;
    this.previousSequence = undefined;
  }

  push(frame: BlufiFrame): BlufiWiFiNetwork[] | null {
    try {
      if (frame.type !== 0x45) throw new Error(`Expected BLUFI Wi-Fi list frame, received 0x${frame.type.toString(16)}`);
      if (this.previousSequence !== undefined && frame.sequence !== ((this.previousSequence + 1) & 0xff)) {
        throw new Error(`BLUFI Wi-Fi list sequence mismatch: expected ${(this.previousSequence + 1) & 0xff}, received ${frame.sequence}`);
      }
      this.previousSequence = frame.sequence;

      if ((frame.frameControl & BLUFI_FC_FRAGMENT) !== 0) {
        if (frame.data.length < 3) throw new Error('BLUFI Wi-Fi list fragment has no payload');
        const declaredRemaining = frame.data[0] | (frame.data[1] << 8);
        const chunk = frame.data.slice(2);
        if (this.totalLength === undefined) this.totalLength = declaredRemaining;
        const expectedRemaining = this.totalLength - this.receivedLength;
        if (declaredRemaining !== expectedRemaining) {
          throw new Error(`BLUFI fragment remaining length mismatch: expected ${expectedRemaining}, received ${declaredRemaining}`);
        }
        if (chunk.length >= declaredRemaining) throw new Error('BLUFI fragment flag set on final/oversized chunk');
        this.chunks.push(chunk);
        this.receivedLength += chunk.length;
        return null;
      }

      if (this.totalLength === undefined) return parseBlufiWiFiList(frame.data);
      const expectedFinalLength = this.totalLength - this.receivedLength;
      if (frame.data.length !== expectedFinalLength) {
        throw new Error(`BLUFI final fragment length mismatch: expected ${expectedFinalLength}, received ${frame.data.length}`);
      }
      this.chunks.push(frame.data);
      const payload = new Uint8Array(this.totalLength);
      let offset = 0;
      for (const chunk of this.chunks) {
        payload.set(chunk, offset);
        offset += chunk.length;
      }
      const networks = parseBlufiWiFiList(payload);
      this.reset();
      return networks;
    } catch (error) {
      this.reset();
      throw error;
    }
  }
}

export function validateBlufiCredentials(ssid: string, password: string): { ssid: Uint8Array; password: Uint8Array } {
  if (/[\u0000-\u001f\u007f]/.test(ssid)) throw new Error('SSID contains unsupported control characters');
  const ssidBytes = new TextEncoder().encode(ssid);
  const passwordBytes = new TextEncoder().encode(password);
  if (ssidBytes.length < 1 || ssidBytes.length > 32) throw new Error('SSID must contain 1 to 32 UTF-8 bytes');
  if (passwordBytes.length > 64) throw new Error('Wi-Fi password must not exceed 64 UTF-8 bytes');
  return { ssid: ssidBytes, password: passwordBytes };
}

export function isSuccessfulWiFiReport(frame: BlufiFrame): boolean {
  return frame.type === 0x3d && (frame.frameControl & BLUFI_FC_FRAGMENT) === 0 && frame.data.length >= 3 && frame.data[1] === 0;
}

export type BlufiWiFiReportState = 'success' | 'failure' | 'progress';

export function getWiFiReportState(frame: BlufiFrame): BlufiWiFiReportState {
  if (frame.type !== 0x3d || (frame.frameControl & BLUFI_FC_FRAGMENT) !== 0 || frame.data.length < 3) {
    throw new Error('Invalid BLUFI Wi-Fi connection report');
  }
  if (frame.data[1] === 0) return 'success';
  if (frame.data[1] === 1) return 'failure';
  if (frame.data[1] === 2 || frame.data[1] === 3) return 'progress';
  throw new Error(`Unknown BLUFI Wi-Fi connection state: ${frame.data[1]}`);
}

export function parseDeviceNameFromAdvertisement(advertisedName: string): string {
  const separator = advertisedName.lastIndexOf('-');
  if (separator < 0 || separator === advertisedName.length - 1) return advertisedName;
  return advertisedName.slice(separator + 1);
}
