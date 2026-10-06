import { BleManager } from 'react-native-ble-plx';

let sharedManager: BleManager | null = null;

export function getBleManager(): BleManager {
  return (sharedManager ??= new BleManager());
}

export function peekBleManager(): BleManager | null {
  return sharedManager;
}
