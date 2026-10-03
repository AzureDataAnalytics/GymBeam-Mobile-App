import type { User } from '@/types/domain';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
}

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthSession>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
}
