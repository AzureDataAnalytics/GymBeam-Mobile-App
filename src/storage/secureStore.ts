import { Platform } from 'react-native';

import * as SecureStore from 'expo-secure-store';

/**
 * Thin typed wrapper over SecureStore. Auth tokens/cookies must never go
 * through AsyncStorage (spec section 7) — this is the only place in the app
 * allowed to persist them.
 *
 * expo-secure-store has no web implementation, so web falls back to
 * localStorage. That's not secure storage — it's only here so the web
 * preview doesn't crash; native (iOS/Android) is the real target.
 */
const webFallback = {
  async getItemAsync(key: string): Promise<string | null> {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    globalThis.localStorage?.setItem(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    globalThis.localStorage?.removeItem(key);
  },
};

const store = Platform.OS === 'web' ? webFallback : SecureStore;

export const secureStore = {
  async getString(key: string): Promise<string | null> {
    return store.getItemAsync(key);
  },

  async setString(key: string, value: string): Promise<void> {
    await store.setItemAsync(key, value);
  },

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await store.getItemAsync(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setJSON(key: string, value: unknown): Promise<void> {
    await store.setItemAsync(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await store.deleteItemAsync(key);
  },
};

export const SECURE_STORE_KEYS = {
  authSession: 'gymbeam.auth.session',
  localUsers: 'gymbeam.auth.localUsers',
  passwordReset: 'gymbeam.auth.passwordReset',
} as const;
