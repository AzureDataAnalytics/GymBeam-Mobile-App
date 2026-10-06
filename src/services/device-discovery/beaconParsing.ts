export type IBeaconFrame = {
  uuid: string;
  major: number;
  minor: number;
  txPowerAt1m: number;
};

export type EddystoneUidFrame = {
  namespace: string;
  instance: string;
  txPowerAt1m: number;
};

export const EDDYSTONE_SERVICE_UUID = '0000feaa-0000-1000-8000-00805f9b34fb';

const APPLE_COMPANY_ID = [0x4c, 0x00];
const IBEACON_TYPE = [0x02, 0x15];
const IBEACON_LENGTH = 25;
const EDDYSTONE_UID_FRAME = 0x00;
const EDDYSTONE_0M_TO_1M_DB = 41;

function decodeBase64(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toSignedByte(byte: number): number {
  return byte > 127 ? byte - 256 : byte;
}

export function parseIBeacon(manufacturerDataBase64: string | null): IBeaconFrame | null {
  if (!manufacturerDataBase64) return null;
  const bytes = decodeBase64(manufacturerDataBase64);
  if (!bytes || bytes.length < IBEACON_LENGTH) return null;

  const header = [...APPLE_COMPANY_ID, ...IBEACON_TYPE];
  if (!header.every((value, index) => bytes[index] === value)) return null;

  const hex = toHex(bytes.subarray(4, 20));
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');

  return {
    uuid,
    major: (bytes[20]! << 8) | bytes[21]!,
    minor: (bytes[22]! << 8) | bytes[23]!,
    txPowerAt1m: toSignedByte(bytes[24]!),
  };
}

export function parseEddystoneUid(serviceDataBase64: string | null): EddystoneUidFrame | null {
  if (!serviceDataBase64) return null;
  const bytes = decodeBase64(serviceDataBase64);
  if (!bytes || bytes.length < 18 || bytes[0] !== EDDYSTONE_UID_FRAME) return null;

  return {
    namespace: toHex(bytes.subarray(2, 12)),
    instance: toHex(bytes.subarray(12, 18)),
    txPowerAt1m: toSignedByte(bytes[1]!) - EDDYSTONE_0M_TO_1M_DB,
  };
}

export function estimateDistanceMeters(rssi: number, txPowerAt1m: number): number | null {
  if (rssi >= 0 || txPowerAt1m >= 0) return null;
  return Math.pow(10, (txPowerAt1m - rssi) / 20);
}

export type BeaconProximity = 'immediate' | 'near' | 'far' | 'unknown';

export function proximityFor(distanceMeters: number | null): BeaconProximity {
  if (distanceMeters === null) return 'unknown';
  if (distanceMeters < 1) return 'immediate';
  if (distanceMeters < 4) return 'near';
  return 'far';
}

export function isSameUuid(a: string, b: string): boolean {
  const normalize = (value: string) => value.replace(/-/g, '').toLowerCase();
  return normalize(a) === normalize(b);
}
