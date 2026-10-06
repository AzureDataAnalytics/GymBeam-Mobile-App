/**
 * Manual Jest mock for expo-crypto (see __mocks__/expo-secure-store.ts for
 * why this pattern is needed — the real native module isn't available under
 * Jest). Backed by Node's built-in `crypto` so hashing/UUIDs behave exactly
 * like real cryptographic primitives in tests, just via Node instead of the
 * native module.
 */
import { createHash, randomFillSync, randomUUID as nodeRandomUUID } from 'node:crypto';

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
} as const;

export async function digestStringAsync(
  _algorithm: (typeof CryptoDigestAlgorithm)[keyof typeof CryptoDigestAlgorithm],
  data: string,
): Promise<string> {
  return createHash('sha256').update(data).digest('hex');
}

export function getRandomValues<T extends Uint32Array>(typedArray: T): T {
  randomFillSync(typedArray);
  return typedArray;
}

export function randomUUID(): string {
  return nodeRandomUUID();
}
