import { LocalAuthService } from './LocalAuthService';
import type { AuthService } from './types';

export * from './types';

/** Single shared instance — swap this for a real backend-backed implementation in the backend phase. */
export const authService: AuthService = new LocalAuthService();
