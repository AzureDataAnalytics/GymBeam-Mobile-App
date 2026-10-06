import { Platform } from 'react-native';
import { BleErrorCode, type BleManager, ScanMode, State, type Device } from 'react-native-ble-plx';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import { env } from '@/constants/env';
import { getBleManager, peekBleManager } from '@/services/device-transport/bleManager';
import { isBluetoothClassicAvailable } from '@/services/device-transport/nativeBluetooth';
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
  kind: 'ibeacon' | 'eddystone' | 'named' | 'ble' | 'classic';
  identity: string | null;
  rssi: number | null;
  distanceMeters: number | null;
  isGymBeam: boolean;
  isPaired?: boolean;
  hasBleLink?: boolean;
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

const GYMBEAM_NAME = /gym[\s_-]?beam/i;

function toBeacon(device: Device): DiscoveredBeacon | null {
  const beacon = describeDevice(device);
  return beacon?.isGymBeam ? { ...beacon, hasBleLink: true } : beacon;
}

function describeDevice(device: Device): DiscoveredBeacon | null {
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

  return {
    address: device.id,
    name,
    kind: 'ble',
    identity: null,
    rssi: device.rssi,
    distanceMeters: null,
    isGymBeam: false,
  };
}

function fromClassicDevice(device: BluetoothDevice, isPaired = false): DiscoveredBeacon {
  const name = device.name && device.name !== device.address ? device.name : null;
  const rssi = Number((device.extra as { rssi?: unknown } | undefined)?.rssi);
  return {
    address: device.address,
    name,
    kind: 'classic',
    identity: null,
    rssi: Number.isFinite(rssi) && rssi < 0 && rssi > -128 ? rssi : null,
    distanceMeters: null,
    isGymBeam: name !== null && GYMBEAM_NAME.test(name),
    isPaired: isPaired || Boolean(device.bonded),
  };
}

const DISCOVERY_RETRY_MS = 1500;
const STATE_SETTLE_TIMEOUT_MS = 3000;

async function settledState(manager: BleManager): Promise<State> {
  const current = await manager.state();
  if (current !== State.Unknown && current !== State.Resetting) return current;

  return new Promise((resolve) => {
    let subscription: { remove(): void } | null = null;
    const timer = setTimeout(() => {
      subscription?.remove();
      resolve(current);
    }, STATE_SETTLE_TIMEOUT_MS);
    subscription = manager.onStateChange((next) => {
      if (next === State.Unknown || next === State.Resetting) return;
      clearTimeout(timer);
      subscription?.remove();
      resolve(next);
    }, true);
  });
}

class BleBeaconScanner implements BeaconScanner {
  readonly isMock = false;
  private discoveryRun = 0;
  private discoverySubscription: { remove(): void } | null = null;

  async start(
    onBeacon: (beacon: DiscoveredBeacon) => void,
    onError: (error: BeaconScanError) => void,
  ): Promise<void> {
    const manager = getBleManager();

    const state = await settledState(manager);
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
        if (beacon && (beacon.hasBleLink || Platform.OS !== 'ios')) onBeacon(beacon);
      },
    );

    if (isBluetoothClassicAvailable) void this.discoverClassicDevices(onBeacon);
    else logger.warn('Bluetooth Classic native module is missing; scanning BLE only');
  }

  stop(): void {
    peekBleManager()
      ?.stopDeviceScan()
      .catch(() => {});
    this.discoveryRun += 1;
    this.discoverySubscription?.remove();
    this.discoverySubscription = null;
    try {
      if (isBluetoothClassicAvailable) RNBluetoothClassic.cancelDiscovery().catch(() => {});
    } catch {}
  }

  private async discoverClassicDevices(onBeacon: (beacon: DiscoveredBeacon) => void) {
    const run = (this.discoveryRun += 1);
    this.discoverySubscription?.remove();
    this.discoverySubscription = RNBluetoothClassic.onDeviceDiscovered(({ device }) =>
      onBeacon(fromClassicDevice(device as BluetoothDevice)),
    );

    while (run === this.discoveryRun) {
      try {
        const paired = await RNBluetoothClassic.getBondedDevices();
        if (run !== this.discoveryRun) return;
        paired.forEach((device) => onBeacon(fromClassicDevice(device, true)));

        const devices = await RNBluetoothClassic.startDiscovery();
        if (run !== this.discoveryRun) return;
        devices.forEach((device) => onBeacon(fromClassicDevice(device)));
      } catch (error) {
        if (run !== this.discoveryRun) return;
        logger.warn('classic discovery pass failed', { message: (error as Error)?.message });
        await new Promise((resolve) => setTimeout(resolve, DISCOVERY_RETRY_MS));
      }
    }
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
  if (Platform.OS === 'web' || env.enableMockDevice) return new MockBeaconScanner();
  return new BleBeaconScanner();
}
