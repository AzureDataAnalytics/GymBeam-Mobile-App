import * as Crypto from 'expo-crypto';

import { ApiError } from '@/api/httpError';
import { SECURE_STORE_KEYS, secureStore } from '@/storage/secureStore';
import type { User } from '@/types/domain';

import type { AuthService, AuthSession, LoginCredentials, RegisterInput } from './types';

interface LocalUserRecord {
  id: string;
  fullName?: string;
  /** Only on legacy accounts, from before login switched to email. */
  username?: string;
  email: string;
  passwordHash: string;
}

type LocalUserTable = Record<string, LocalUserRecord>;

export class LocalAuthService implements AuthService {
  async login({ email, password }: LoginCredentials): Promise<AuthSession> {
    const record = findByEmail(await this.getUserTable(), email);
    if (!record) {
      throw new ApiError('auth', 'Invalid email or password');
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== record.passwordHash) {
      throw new ApiError('auth', 'Invalid email or password');
    }

    const session: AuthSession = { user: toUser(record) };
    await secureStore.setJSON(SECURE_STORE_KEYS.authSession, session);
    return session;
  }

  async register({ fullName, email, password }: RegisterInput): Promise<void> {
    const table = await this.getUserTable();

    if (findByEmail(table, email)) {
      throw new ApiError('validation', 'That email is already registered on this device');
    }

    const record: LocalUserRecord = {
      id: Crypto.randomUUID(),
      fullName: fullName.trim(),
      email: email.trim(),
      passwordHash: await hashPassword(password),
    };

    table[normalizeEmail(email)] = record;
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function findByEmail(table: LocalUserTable, email: string): LocalUserRecord | undefined {
  const target = normalizeEmail(email);
  return Object.values(table).find((user) => normalizeEmail(user.email) === target);
}

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

function toUser(record: LocalUserRecord): User {
  return {
    id: record.id,
    name: record.fullName || record.username || record.email,
    email: record.email,
    roles: ['member'],
  };
}
