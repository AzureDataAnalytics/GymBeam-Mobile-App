import * as Crypto from 'expo-crypto';

import { SECURE_STORE_KEYS, secureStore } from '@/storage/secureStore';
import type { User } from '@/types/domain';

import { createPasswordResetMailer, type PasswordResetMailer } from './passwordResetMailer';

import {
  AuthError,
  type AuthService,
  type AuthSession,
  type LoginCredentials,
  type RegisterInput,
  type ResetPasswordInput,
} from './types';

type LocalUserRecord = {
  id: string;
  fullName?: string;
  /** Only on legacy accounts, from before login switched to email. */
  username?: string;
  email: string;
  passwordHash: string;
};

type LocalUserTable = Record<string, LocalUserRecord>;

type PendingPasswordReset = {
  email: string;
  codeHash: string;
  expiresAt: number;
  attemptsLeft: number;
};

export const RESET_CODE_TTL_MINUTES = 15;
const RESET_CODE_ATTEMPTS = 5;

export class LocalAuthService implements AuthService {
  constructor(private readonly mailer: PasswordResetMailer | null = createPasswordResetMailer()) {}

  async login({ email, password }: LoginCredentials): Promise<AuthSession> {
    const record = findByEmail(await this.getUserTable(), email);
    if (!record) {
      throw new AuthError('Invalid email or password');
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== record.passwordHash) {
      throw new AuthError('Invalid email or password');
    }

    const session: AuthSession = { user: toUser(record) };
    await secureStore.setJSON(SECURE_STORE_KEYS.authSession, session);
    return session;
  }

  async register({ fullName, email, password }: RegisterInput): Promise<void> {
    const table = await this.getUserTable();

    if (findByEmail(table, email)) {
      throw new AuthError('That email is already registered on this device');
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

  async requestPasswordReset(email: string): Promise<void> {
    const record = findByEmail(await this.getUserTable(), email);
    if (!record) {
      throw new AuthError('There’s no account with that email on this phone.');
    }
    if (!this.mailer) {
      throw new AuthError('Password reset emails aren’t set up for this app yet.');
    }

    const code = generateResetCode();
    const pending: PendingPasswordReset = {
      email: normalizeEmail(email),
      codeHash: await hashResetCode(email, code),
      expiresAt: Date.now() + RESET_CODE_TTL_MINUTES * 60_000,
      attemptsLeft: RESET_CODE_ATTEMPTS,
    };
    await secureStore.setJSON(SECURE_STORE_KEYS.passwordReset, pending);

    try {
      await this.mailer.sendCode({
        email: record.email,
        name: toUser(record).name,
        code,
        expiresInMinutes: RESET_CODE_TTL_MINUTES,
      });
    } catch {
      await secureStore.remove(SECURE_STORE_KEYS.passwordReset);
      throw new AuthError(
        'We couldn’t send the email. Check your internet connection and try again.',
      );
    }
  }

  async resetPassword({ email, code, newPassword }: ResetPasswordInput): Promise<void> {
    const pending = await secureStore.getJSON<PendingPasswordReset>(
      SECURE_STORE_KEYS.passwordReset,
    );
    if (!pending || pending.email !== normalizeEmail(email) || Date.now() > pending.expiresAt) {
      await secureStore.remove(SECURE_STORE_KEYS.passwordReset);
      throw new AuthError('That code has expired. Request a new one.');
    }

    if ((await hashResetCode(email, code.trim())) !== pending.codeHash) {
      const attemptsLeft = pending.attemptsLeft - 1;
      if (attemptsLeft <= 0) {
        await secureStore.remove(SECURE_STORE_KEYS.passwordReset);
        throw new AuthError('Too many wrong codes. Request a new one.');
      }
      await secureStore.setJSON(SECURE_STORE_KEYS.passwordReset, { ...pending, attemptsLeft });
      throw new AuthError('That code isn’t right. Check the email and try again.');
    }

    const table = await this.getUserTable();
    const entry = Object.entries(table).find(
      ([, user]) => normalizeEmail(user.email) === pending.email,
    );
    if (!entry) {
      throw new AuthError('There’s no account with that email on this phone.');
    }
    table[entry[0]] = { ...entry[1], passwordHash: await hashPassword(newPassword) };
    await secureStore.setJSON(SECURE_STORE_KEYS.localUsers, table);
    await secureStore.remove(SECURE_STORE_KEYS.passwordReset);
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

/** Six digits, from the platform's secure random source. */
function generateResetCode(): string {
  const [value] = Crypto.getRandomValues(new Uint32Array(1));
  return String((value ?? 0) % 1_000_000).padStart(6, '0');
}

async function hashResetCode(email: string, code: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${normalizeEmail(email)}:${code}`,
  );
}

function toUser(record: LocalUserRecord): User {
  return {
    id: record.id,
    name: record.fullName || record.username || record.email,
    email: record.email,
    roles: ['member'],
  };
}
