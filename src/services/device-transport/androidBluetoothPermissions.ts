import { PermissionsAndroid, Platform } from 'react-native';

import { createLogger } from '@/utils/logger';

const logger = createLogger('device.permissions');

/**
 * Android 12+ (API 31) requires runtime BLUETOOTH_CONNECT/BLUETOOTH_SCAN
 * grants; older Android ties classic-Bluetooth discovery to location
 * permission instead. Requesting all three covers both cases — a permission
 * that doesn't apply to the running OS version is simply not present in
 * `PermissionsAndroid.PERMISSIONS` results as "never_ask_again" territory,
 * it's just omitted, so this is safe to call unconditionally on Android.
 */
export async function requestAndroidBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    const granted = Object.values(results).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!granted) {
      logger.warn('one or more Bluetooth permissions were denied', { results });
    }

    return granted;
  } catch (error) {
    logger.error('permission request failed', { message: (error as Error)?.message });
    return false;
  }
}
