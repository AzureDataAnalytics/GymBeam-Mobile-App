import { __resetSecureStoreMock } from '../../__mocks__/expo-secure-store';

import { LocalAuthService } from '@/services/auth/LocalAuthService';

describe('LocalAuthService', () => {
  let auth: LocalAuthService;

  beforeEach(() => {
    __resetSecureStoreMock();
    auth = new LocalAuthService();
  });

  it('rejects login for an account that was never registered', async () => {
    await expect(auth.login({ username: 'nobody', password: 'whatever' })).rejects.toThrow();
  });

  it('registers, then logs in with the same credentials', async () => {
    await auth.register({ username: 'trainee1', email: 't1@example.com', password: 'correcthorse' });

    const session = await auth.login({ username: 'trainee1', password: 'correcthorse' });

    expect(session.user.name).toBe('trainee1');
    expect(session.user.email).toBe('t1@example.com');
  });

  it('rejects login with the wrong password', async () => {
    await auth.register({ username: 'trainee2', email: 't2@example.com', password: 'correcthorse' });

    await expect(auth.login({ username: 'trainee2', password: 'wrong-password' })).rejects.toThrow();
  });

  it('rejects registering the same username twice (case-insensitively)', async () => {
    await auth.register({ username: 'trainee3', email: 't3@example.com', password: 'pw12345' });

    await expect(
      auth.register({ username: 'Trainee3', email: 'other@example.com', password: 'pw12345' }),
    ).rejects.toThrow();
  });

  it('persists and restores a session, then clears it on logout', async () => {
    await auth.register({ username: 'trainee4', email: 't4@example.com', password: 'pw12345' });
    await auth.login({ username: 'trainee4', password: 'pw12345' });

    const restored = await auth.restoreSession();
    expect(restored?.user.name).toBe('trainee4');

    await auth.logout();
    expect(await auth.restoreSession()).toBeNull();
  });
});
