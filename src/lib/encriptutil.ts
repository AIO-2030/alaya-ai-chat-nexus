// Encryption Utility - CRC16 calculation for BLUFI protocol
// This file contains encryption and checksum utilities used across the application

/**
 * BLUFI checksum matching this firmware's
 * `~esp_rom_crc16_be(0xffff, Seq|Len|Data)` callback.
 * esp_rom_crc16_be complements its input and output internally, so the
 * resulting parameters are CRC-16/XMODEM: poly 0x1021, init 0, xorout 0.
 * @param data - The data to calculate CRC16 for
 * @returns CRC16 checksum value
 */
export function calculateCRC16(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc;
}

/**
 * Additional encryption utilities can be added here
 * For example: AES encryption, hash functions, etc.
 */
