import { Platform } from 'react-native';
import { BleErrorCode, BleManager, ScanMode, State, type Device } from 'react-native-ble-plx';

import { env } from '@/constants/env';
import { createLogger } from '@/utils/logger';

import {
  EDDYSTONE_SERVICE_UUID,
  estimateDistanceMeters,
  isSameUuid,
  parseEddystoneUid,
  parseIBeacon,
} from './beaconParsing';

const logger = createLogger('device.beaconScanner');

export type DiscoveredBeacon = {
  address: string;
  name: string | null;
  kind: 'ibeacon' | 'eddystone' | 'named';
  identity: string | null;
  rssi: number;
  distanceMeters: number | null;
  isGymBeam: boolean;
};

export type BeaconScanErrorCode =
  'bluetooth-off' | 'unauthorized' | 'location-off' | 'unsupported' | 'unknown';

export class BeaconScanError extends Error {
  constructor(
    readonly code: BeaconScanErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BeaconScanError';
  }
}

export type BeaconScanner = {
  readonly isMock: boolean;
  start(
    onBeacon: (beacon: DiscoveredBeacon) => void,
    onError: (error: BeaconScanError) => void,
  ): Promise<void>;
  stop(): void;
};

const GYMBEAM_NAME = /gym\s?beam/i;

function toBeacon(device: Device): DiscoveredBeacon | null {
  if (device.rssi === null) return null;
  const name = device.localName ?? device.name;
  const namedGymBeam = name !== null && GYMBEAM_NAME.test(name);

  const iBeacon = parseIBeacon(device.manufacturerData);
  if (iBeacon) {
    const matchesConfigured = env.beaconUuid ? isSameUuid(iBeacon.uuid, env.beaconUuid) : false;
    return {
      address: device.id,
      name,
      kind: 'ibeacon',
      identity: `${iBeacon.uuid} · ${iBeacon.major}/${iBeacon.minor}`,
      rssi: device.rssi,
      distanceMeters: estimateDistanceMeters(device.rssi, iBeacon.txPowerAt1m),
      isGymBeam: matchesConfigured || namedGymBeam,
    };
  }

  const eddystone = parseEddystoneUid(device.serviceData?.[EDDYSTONE_SERVICE_UUID] ?? null);
  if (eddystone) {
    return {
      address: device.id,
      name,
      kind: 'eddystone',
      identity: `${eddystone.namespace} · ${eddystone.instance}`,
      rssi: device.rssi,
      distanceMeters: estimateDistanceMeters(device.rssi, eddystone.txPowerAt1m),
      isGymBeam: namedGymBeam,
    };
  }

  if (namedGymBeam) {
    return {
      address: device.id,
      name,
      kind: 'named',
      identity: null,
      rssi: device.rssi,
      distanceMeters: null,
      isGymBeam: true,
    };
  }

  return null;
}

let sharedManager: BleManager | null = null;

class BleBeaconScanner implements BeaconScanner {
  readonly isMock = false;

  async start(
    onBeacon: (beacon: DiscoveredBeacon) => void,
    onError: (error: BeaconScanError) => void,
  ): Promise<void> {
    const manager = (sharedManager ??= new BleManager());

    const state = await manager.state();
    if (state === State.PoweredOff) {
      throw new BeaconScanError('bluetooth-off', 'Bluetooth is turned off on this phone.');
    }
    if (state === State.Unauthorized) {
      throw new BeaconScanError('unauthorized', 'Bluetooth permission was not granted.');
    }
    if (state === State.Unsupported) {
      throw new BeaconScanError('unsupported', 'This phone does not support Bluetooth LE.');
    }

    await manager.startDeviceScan(
      null,
      { scanMode: ScanMode.LowLatency, allowDuplicates: true },
      (error, device) => {
        if (error) {
          logger.warn('scan error', { code: error.errorCode, message: error.message });
          onError(new BeaconScanError(toErrorCode(error.errorCode), error.message));
          return;
        }
        const beacon = device ? toBeacon(device) : null;
        // With a configured UUID, anything that isn't a GymBeam unit is noise.
        if (beacon && (beacon.isGymBeam || !env.beaconUuid)) onBeacon(beacon);
      },
    );
  }

  stop(): void {
    sharedManager?.stopDeviceScan().catch(() => {});
  }
}

function toErrorCode(code: BleErrorCode): BeaconScanErrorCode {
  switch (code) {
    case BleErrorCode.BluetoothPoweredOff:
      return 'bluetooth-off';
    case BleErrorCode.BluetoothUnauthorized:
      return 'unauthorized';
    case BleErrorCode.LocationServicesDisabled:
      return 'location-off';
    case BleErrorCode.BluetoothUnsupported:
      return 'unsupported';
    default:
      return 'unknown';
  }
}

const MOCK_ADDRESS = 'MOCK:GYMBEAM:01';

class MockBeaconScanner implements BeaconScanner {
  readonly isMock = true;
  private timer: ReturnType<typeof setInterval> | null = null;

  async start(onBeacon: (beacon: DiscoveredBeacon) => void): Promise<void> {
    this.stop();
    let tick = 0;
    this.timer = setInterval(() => {
      tick += 1;
      if (tick < 2) return;
      const rssi = Math.round(-62 + 6 * Math.sin(tick / 2));
      onBeacon({
        address: MOCK_ADDRESS,
        name: 'GymBeam Trainer (simulated)',
        kind: 'ibeacon',
        identity: null,
        rssi,
        distanceMeters: estimateDistanceMeters(rssi, -59),
        isGymBeam: true,
      });
    }, 800);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export function createBeaconScanner(): BeaconScanner {
  if (Platform.OS !== 'android' || env.enableMockDevice) return new MockBeaconScanner();
  return new BleBeaconScanner();
}
