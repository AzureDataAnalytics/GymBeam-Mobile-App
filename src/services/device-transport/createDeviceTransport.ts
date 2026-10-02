import { Platform } from 'react-native';

import { env } from '@/constants/env';

import { BluetoothClassicTransport } from './BluetoothClassicTransport';
import { MockDeviceTransport } from './MockDeviceTransport';
import type { DeviceTransport } from './types';

/**
 * Picks the right transport for the current platform/build. iOS has no real
 * transport (see BluetoothClassicTransport's doc comment), so it always gets
 * the mock. Android gets the mock only when explicitly enabled via
 * EXPO_PUBLIC_ENABLE_MOCK_DEVICE — flip that to "false" once a development
 * build with the Bluetooth Classic native module is actually installed.
 */
export function createDeviceTransport(pairedMacAddress?: string): DeviceTransport {
  if (Platform.OS === 'ios') {
    return new MockDeviceTransport();
  }

  if (env.enableMockDevice || !pairedMacAddress) {
    return new MockDeviceTransport();
  }

  return new BluetoothClassicTransport(pairedMacAddress);
}
