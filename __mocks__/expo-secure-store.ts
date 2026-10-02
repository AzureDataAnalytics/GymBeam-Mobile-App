/**
 * Manual Jest mock for expo-secure-store. Jest auto-applies any mock placed
 * in a root-level `__mocks__/<module-name>` for a node_modules package, no
 * `jest.mock()` call needed — see Jest's manual mocks docs. Backed by a
 * plain in-memory Map so tests can register/login/restore a session without
 * a real device Keychain/Keystore.
 */
const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? store.get(key)! : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

export function __resetSecureStoreMock(): void {
  store.clear();
}
