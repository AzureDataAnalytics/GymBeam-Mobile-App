import type { User } from '@/types/domain';

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
};

export type ResetPasswordInput = {
  email: string;
  code: string;
  newPassword: string;
};

export type AuthSession = {
  user: User;
};

/** Thrown by an AuthService with a message that is safe to show the user. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export type AuthService = {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
  /** Emails a one-time code that resetPassword() will accept for a short while. */
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
};
