import * as Crypto from 'expo-crypto';

import { ApiError } from '@/api/httpError';
import { SECURE_STORE_KEYS, secureStore } from '@/storage/secureStore';
import type { User } from '@/types/domain';

import type { AuthService, AuthSession, LoginCredentials, RegisterInput } from './types';

interface LocalUserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
}

type LocalUserTable = Record<string, LocalUserRecord>; // keyed by lowercased username

/**
 * On-device-only auth. No network call, no backend — this app has none right
 * now (the previous phase's Drupal backend was confirmed decommissioned on
 * 2026-09-21; a real backend is planned as its own later phase, see
 * docs/api-integration.md). Accounts and password hashes live only in this
 * device's SecureStore; there is nothing to sync, and uninstalling the app
 * or clearing its storage deletes the account.
 *
 * This is intentionally NOT a substitute for real server-side auth — there's
 * no way to recover access from another device, and SHA-256 without a
 * per-user salt is adequate for "a local device gate," not for protecting an
 * account against a serious attacker. Replace this wholesale with a real
 * `AuthService` implementation once the backend phase exists; nothing
 * outside `src/services/auth` should need to change to make that swap.
 */
export class LocalAuthService implements AuthService {
  async login({ username, password }: LoginCredentials): Promise<AuthSession> {
    const table = await this.getUserTable();
    const record = table[normalizeUsername(username)];
    if (!record) {
      throw new ApiError('auth', 'Invalid username or password');
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== record.passwordHash) {
      throw new ApiError('auth', 'Invalid username or password');
    }

    const session: AuthSession = { user: toUser(record) };
    await secureStore.setJSON(SECURE_STORE_KEYS.authSession, session);
    return session;
  }

  async register({ username, email, password }: RegisterInput): Promise<void> {
    const table = await this.getUserTable();
    const key = normalizeUsername(username);

    if (table[key]) {
      throw new ApiError('validation', 'That username is already taken on this device');
    }

    const record: LocalUserRecord = {
      id: Crypto.randomUUID(),
      username,
      email,
      passwordHash: await hashPassword(password),
    };

    table[key] = record;
    await secureStore.setJSON(SECURE_STORE_KEYS.localUsers, table);
  }

  async logout(): Promise<void> {
    await secureStore.remove(SECURE_STORE_KEYS.authSession);
  }

  async restoreSession(): Promise<AuthSession | null> {
    return secureStore.getJSON<AuthSession>(SECURE_STORE_KEYS.authSession);
  }

  private async getUserTable(): Promise<LocalUserTable> {
    return (await secureStore.getJSON<LocalUserTable>(SECURE_STORE_KEYS.localUsers)) ?? {};
  }
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

function toUser(record: LocalUserRecord): User {
  return {
    id: record.id,
    name: record.username,
    email: record.email,
    roles: ['member'],
  };
}
