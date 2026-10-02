import type { User } from '@/types/domain';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
}

/**
 * Backend-agnostic auth contract (spec section 7). LocalAuthService is the
 * only implementation today — the Drupal backend this originally targeted
 * was confirmed decommissioned (2026-09-21: the host now 404s on every
 * endpoint). See docs/api-integration.md. Swapping in a real backend later
 * means writing a new class against this same interface, not touching call
 * sites.
 */
export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  /** Reads a persisted session without a network round-trip; callers should still handle a later 401. */
  restoreSession(): Promise<AuthSession | null>;
}
