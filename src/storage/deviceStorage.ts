import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A paired device's MAC address isn't sensitive (unlike auth tokens), so it
 * lives in AsyncStorage rather than SecureStore — this is just "which
 * hardware did the user pick last," not a credential.
 */
const PAIRED_MAC_ADDRESS_KEY = 'gymbeam.device.pairedMacAddress';

export const deviceStorage = {
  async getPairedMacAddress(): Promise<string | null> {
    return AsyncStorage.getItem(PAIRED_MAC_ADDRESS_KEY);
  },

  async setPairedMacAddress(address: string | null): Promise<void> {
    if (address) {
      await AsyncStorage.setItem(PAIRED_MAC_ADDRESS_KEY, address);
    } else {
      await AsyncStorage.removeItem(PAIRED_MAC_ADDRESS_KEY);
    }
  },
};
