import { LocalAuthService } from './LocalAuthService';
import type { AuthService } from './types';

export * from './types';

export const authService: AuthService = new LocalAuthService();
