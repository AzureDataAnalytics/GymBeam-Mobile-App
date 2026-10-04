import { Platform } from 'react-native';

import { env } from '@/constants/env';

import { BluetoothClassicTransport } from './BluetoothClassicTransport';
import { MockDeviceTransport } from './MockDeviceTransport';
import type { DeviceTransport } from './types';
import { WifiTransport } from './WifiTransport';

export interface DeviceLink {
  macAddress?: string | null;
  wifiAddress?: string | null;
}

export function createDeviceTransport(link: DeviceLink = {}): DeviceTransport {
  if (env.enableMockDevice) return new MockDeviceTransport();

  if (link.wifiAddress) return new WifiTransport(link.wifiAddress);

  if (Platform.OS === 'ios' || !link.macAddress) return new MockDeviceTransport();

  return new BluetoothClassicTransport(link.macAddress);
}
