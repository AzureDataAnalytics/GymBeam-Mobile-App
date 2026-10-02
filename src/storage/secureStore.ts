import * as SecureStore from 'expo-secure-store';

/**
 * Thin typed wrapper over SecureStore. Auth tokens/cookies must never go
 * through AsyncStorage (spec section 7) — this is the only place in the app
 * allowed to persist them.
 */
export const secureStore = {
  async getString(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },

  async setString(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

export const SECURE_STORE_KEYS = {
  authSession: 'gymbeam.auth.session',
  localUsers: 'gymbeam.auth.localUsers',
} as const;
