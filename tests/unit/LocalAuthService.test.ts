import * as Crypto from 'expo-crypto';

import { __resetSecureStoreMock } from '../../__mocks__/expo-secure-store';

import { LocalAuthService } from '@/services/auth/LocalAuthService';
import { SECURE_STORE_KEYS, secureStore } from '@/storage/secureStore';

describe('LocalAuthService', () => {
  let auth: LocalAuthService;

  beforeEach(() => {
    __resetSecureStoreMock();
    auth = new LocalAuthService();
  });

  it('rejects login for an account that was never registered', async () => {
    await expect(
      auth.login({ email: 'nobody@example.com', password: 'whatever' }),
    ).rejects.toThrow();
  });

  it('registers, then logs in with the same credentials', async () => {
    await auth.register({
      fullName: 'Trainee 1',
      email: 't1@example.com',
      password: 'correcthorse',
    });

    const session = await auth.login({ email: 't1@example.com', password: 'correcthorse' });

    expect(session.user.name).toBe('Trainee 1');
    expect(session.user.email).toBe('t1@example.com');
  });

  it('matches the login email case- and whitespace-insensitively', async () => {
    await auth.register({
      fullName: 'Trainee 5',
      email: 't5@example.com',
      password: 'correcthorse',
    });

    const session = await auth.login({ email: ' T5@Example.com ', password: 'correcthorse' });

    expect(session.user.name).toBe('Trainee 5');
  });

  it('rejects login with the wrong password', async () => {
    await auth.register({
      fullName: 'Trainee 2',
      email: 't2@example.com',
      password: 'correcthorse',
    });

    await expect(
      auth.login({ email: 't2@example.com', password: 'wrong-password' }),
    ).rejects.toThrow();
  });

  it('rejects registering an email that is already in use (case-insensitively)', async () => {
    await auth.register({
      fullName: 'Trainee 6',
      email: 't6@example.com',
      password: 'pw12345',
    });

    await expect(
      auth.register({
        fullName: 'Someone Else',
        email: 'T6@example.com',
        password: 'pw12345',
      }),
    ).rejects.toThrow();
  });

  it('still logs in legacy accounts that were stored under a username', async () => {
    // Pre-email-login shape: keyed by username, no fullName.
    await secureStore.setJSON(SECURE_STORE_KEYS.localUsers, {
      oldtimer: {
        id: 'legacy-1',
        username: 'oldtimer',
        email: 'old@example.com',
        passwordHash: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          'pw12345',
        ),
      },
    });

    const session = await auth.login({ email: 'old@example.com', password: 'pw12345' });

    expect(session.user.name).toBe('oldtimer');
  });

  it('persists and restores a session, then clears it on logout', async () => {
    await auth.register({
      fullName: 'Trainee 4',
      email: 't4@example.com',
      password: 'pw12345',
    });
    await auth.login({ email: 't4@example.com', password: 'pw12345' });

    const restored = await auth.restoreSession();
    expect(restored?.user.name).toBe('Trainee 4');

    await auth.logout();
    expect(await auth.restoreSession()).toBeNull();
  });
});
