import { Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export type BondedDeviceSummary = {
  name: string;
  address: string;
};

export async function listBondedDevices(): Promise<BondedDeviceSummary[]> {
  if (Platform.OS !== 'android') return [];

  const devices = await RNBluetoothClassic.getBondedDevices();
  return devices.map((device) => ({ name: device.name, address: device.address }));
}

export async function isBluetoothEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return RNBluetoothClassic.isBluetoothEnabled();
}

export async function ensureBonded(address: string): Promise<void> {
  if (Platform.OS !== 'android') return;

  const bonded = await RNBluetoothClassic.getBondedDevices();
  if (bonded.some((device) => device.address.toUpperCase() === address.toUpperCase())) return;

  await RNBluetoothClassic.pairDevice(address);
}
