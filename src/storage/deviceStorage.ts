import AsyncStorage from '@react-native-async-storage/async-storage';

const PAIRED_MAC_ADDRESS_KEY = 'gymbeam.device.pairedMacAddress';
const WIFI_ADDRESS_KEY = 'gymbeam.device.wifiAddress';

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

  async getWifiAddress(): Promise<string | null> {
    return AsyncStorage.getItem(WIFI_ADDRESS_KEY);
  },

  async setWifiAddress(address: string | null): Promise<void> {
    if (address) {
      await AsyncStorage.setItem(WIFI_ADDRESS_KEY, address);
    } else {
      await AsyncStorage.removeItem(WIFI_ADDRESS_KEY);
    }
  },
};
