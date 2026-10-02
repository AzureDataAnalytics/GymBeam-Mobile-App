import { Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export interface BondedDeviceSummary {
  name: string;
  address: string;
}

/**
 * Lists devices already paired at the OS level. The Pi must be paired via
 * Android's Bluetooth settings first (same prerequisite the legacy Flutter
 * app had) — this app doesn't do discovery/pairing itself, only picks among
 * already-bonded devices. See docs/device-integration.md.
 */
export async function listBondedDevices(): Promise<BondedDeviceSummary[]> {
  if (Platform.OS !== 'android') return [];

  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices.map((device) => ({ name: device.name, address: device.address }));
}

export async function isBluetoothEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return RNBluetoothClassic.isBluetoothEnabled();
}
