import { create } from 'zustand';

import { authService, type LoginCredentials, type RegisterInput } from '@/services/auth';
import type { User } from '@/types/domain';
import { createLogger } from '@/utils/logger';

const logger = createLogger('state.auth');

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  isSubmitting: boolean;
  bootstrap: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  error: null,
  isSubmitting: false,

  bootstrap: async () => {
    const session = await authService.restoreSession();
    set({ status: session ? 'authenticated' : 'unauthenticated', user: session?.user ?? null });
  },

  login: async (credentials) => {
    set({ isSubmitting: true, error: null });
    try {
      const session = await authService.login(credentials);
      set({ status: 'authenticated', user: session.user, isSubmitting: false });
    } catch (error) {
      logger.warn('login failed', { message: (error as Error)?.message });
      set({ isSubmitting: false, error: 'We couldn’t sign you in. Check your details and try again.' });
      throw error;
    }
  },

  register: async (input) => {
    set({ isSubmitting: true, error: null });
    try {
      await authService.register(input);
      set({ isSubmitting: false });
    } catch (error) {
      logger.warn('register failed', { message: (error as Error)?.message });
      set({ isSubmitting: false, error: 'We couldn’t create your account. Please try again.' });
      throw error;
    }
  },

  logout: async () => {
    await authService.logout();
    set({ status: 'unauthenticated', user: null });
  },
}));
