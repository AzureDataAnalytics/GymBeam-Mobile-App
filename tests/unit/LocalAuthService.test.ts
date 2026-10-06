import * as Crypto from 'expo-crypto';

import { __resetSecureStoreMock } from '../../__mocks__/expo-secure-store';

import { LocalAuthService } from '@/services/auth/LocalAuthService';
import type { PasswordResetEmail } from '@/services/auth/passwordResetMailer';
import { AuthError } from '@/services/auth/types';
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

describe('LocalAuthService password reset', () => {
  let sent: PasswordResetEmail[];
  let auth: LocalAuthService;

  beforeEach(async () => {
    __resetSecureStoreMock();
    sent = [];
    auth = new LocalAuthService({ sendCode: async (message) => void sent.push(message) });
    await auth.register({
      fullName: 'Trainee 7',
      email: 't7@example.com',
      password: 'old-password',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emails a 6-digit code, and that code sets a new password', async () => {
    await auth.requestPasswordReset(' T7@Example.com ');

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ email: 't7@example.com', name: 'Trainee 7' });
    expect(sent[0]!.code).toMatch(/^\d{6}$/);

    await auth.resetPassword({
      email: 't7@example.com',
      code: sent[0]!.code,
      newPassword: 'new-password',
    });

    await expect(
      auth.login({ email: 't7@example.com', password: 'old-password' }),
    ).rejects.toThrow();
    await expect(
      auth.login({ email: 't7@example.com', password: 'new-password' }),
    ).resolves.toBeDefined();
  });

  it('does not keep the code readable on the phone', async () => {
    await auth.requestPasswordReset('t7@example.com');

    const stored = await secureStore.getString(SECURE_STORE_KEYS.passwordReset);
    expect(stored).not.toContain(sent[0]!.code);
  });

  it('refuses an email with no account on this phone, without sending anything', async () => {
    await expect(auth.requestPasswordReset('nobody@example.com')).rejects.toThrow(AuthError);
    expect(sent).toHaveLength(0);
  });

  it('rejects a wrong code and locks the reset after five wrong tries', async () => {
    await auth.requestPasswordReset('t7@example.com');
    const code = sent[0]!.code;
    const wrong = code === '000000' ? '111111' : '000000';
    const attempt = (value: string) =>
      auth.resetPassword({ email: 't7@example.com', code: value, newPassword: 'new-password' });

    for (let i = 0; i < 4; i++) {
      await expect(attempt(wrong)).rejects.toThrow('isn’t right');
    }
    await expect(attempt(wrong)).rejects.toThrow('Too many');
    await expect(attempt(code)).rejects.toThrow('expired');
    await expect(
      auth.login({ email: 't7@example.com', password: 'old-password' }),
    ).resolves.toBeDefined();
  });

  it('rejects the code after 15 minutes', async () => {
    jest.useFakeTimers();
    await auth.requestPasswordReset('t7@example.com');

    jest.advanceTimersByTime(16 * 60_000);

    await expect(
      auth.resetPassword({
        email: 't7@example.com',
        code: sent[0]!.code,
        newPassword: 'new-password',
      }),
    ).rejects.toThrow('expired');
  });

  it('only accepts the newest code after a resend', async () => {
    await auth.requestPasswordReset('t7@example.com');
    await auth.requestPasswordReset('t7@example.com');
    const [first, second] = sent.map((message) => message.code);

    if (first !== second) {
      await expect(
        auth.resetPassword({ email: 't7@example.com', code: first!, newPassword: 'new-password' }),
      ).rejects.toThrow('isn’t right');
    }
    await expect(
      auth.resetPassword({ email: 't7@example.com', code: second!, newPassword: 'new-password' }),
    ).resolves.toBeUndefined();
  });

  it('reports a failed send and leaves no usable code behind', async () => {
    const failing = new LocalAuthService({
      sendCode: async () => {
        throw new Error('offline');
      },
    });

    await expect(failing.requestPasswordReset('t7@example.com')).rejects.toThrow('couldn’t send');
    expect(await secureStore.getString(SECURE_STORE_KEYS.passwordReset)).toBeNull();
  });

  it('says reset is not set up when there is no way to send email', async () => {
    const noMailer = new LocalAuthService(null);

    await expect(noMailer.requestPasswordReset('t7@example.com')).rejects.toThrow('aren’t set up');
  });
});
