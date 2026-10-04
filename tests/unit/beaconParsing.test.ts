import {
  estimateDistanceMeters,
  isSameUuid,
  parseEddystoneUid,
  parseIBeacon,
  proximityFor,
} from '@/services/device-discovery/beaconParsing';

function base64(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64');
}

const UUID_BYTES = [
  0xe2, 0xc5, 0x6d, 0xb5, 0xdf, 0xfb, 0x48, 0xd2, 0xb0, 0x60, 0xd0, 0xf5, 0xa7, 0x10, 0x96, 0xe0,
];

describe('beaconParsing', () => {
  it('decodes an iBeacon frame', () => {
    const frame = parseIBeacon(
      base64([0x4c, 0x00, 0x02, 0x15, ...UUID_BYTES, 0x00, 0x01, 0x01, 0x02, 0xc5]),
    );

    expect(frame).toEqual({
      uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
      major: 1,
      minor: 258,
      txPowerAt1m: -59,
    });
  });

  it('rejects manufacturer data that is not an iBeacon', () => {
    expect(parseIBeacon(null)).toBeNull();
    expect(parseIBeacon('not base64 !!')).toBeNull();
    // Right length, wrong company ID.
    expect(
      parseIBeacon(base64([0x06, 0x00, 0x02, 0x15, ...UUID_BYTES, 0, 1, 0, 2, 0xc5])),
    ).toBeNull();
    // Apple company ID but truncated.
    expect(parseIBeacon(base64([0x4c, 0x00, 0x02, 0x15, 0x01]))).toBeNull();
  });

  it('decodes an Eddystone UID frame and converts TX power to 1m', () => {
    const namespace = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const instance = [0xa, 0xb, 0xc, 0xd, 0xe, 0xf];
    const frame = parseEddystoneUid(base64([0x00, 0xee, ...namespace, ...instance]));

    expect(frame).toEqual({
      namespace: '0102030405060708090a',
      instance: '0a0b0c0d0e0f',
      txPowerAt1m: -18 - 41,
    });
    // URL frame (0x10) is not a UID frame.
    expect(parseEddystoneUid(base64([0x10, 0xee, ...namespace, ...instance]))).toBeNull();
  });

  it('estimates distance from signal strength', () => {
    expect(estimateDistanceMeters(-59, -59)).toBeCloseTo(1);
    expect(estimateDistanceMeters(-79, -59)).toBeCloseTo(10);
    expect(estimateDistanceMeters(0, -59)).toBeNull();
  });

  it('buckets distance into proximity', () => {
    expect(proximityFor(0.4)).toBe('immediate');
    expect(proximityFor(2)).toBe('near');
    expect(proximityFor(9)).toBe('far');
    expect(proximityFor(null)).toBe('unknown');
  });

  it('compares UUIDs ignoring case and dashes', () => {
    expect(
      isSameUuid('E2C56DB5-DFFB-48D2-B060-D0F5A71096E0', 'e2c56db5dffb48d2b060d0f5a71096e0'),
    ).toBe(true);
    expect(isSameUuid('e2c56db5-dffb-48d2-b060-d0f5a71096e0', 'ffffffff')).toBe(false);
  });
});
