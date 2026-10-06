import { env } from '@/constants/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('auth.passwordReset');

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const SEND_TIMEOUT_MS = 15_000;

export type PasswordResetEmail = {
  email: string;
  name: string;
  code: string;
  expiresInMinutes: number;
};

export type PasswordResetMailer = {
  sendCode(message: PasswordResetEmail): Promise<void>;
};

type EmailJsConfig = NonNullable<typeof env.emailJs>;

/**
 * Sends the code through EmailJS, a hosted service that lets an app send
 * email without a server of its own. This is the app's only internet call.
 * The EmailJS template must use the variables sent in `template_params`.
 */
export class EmailJsMailer implements PasswordResetMailer {
  constructor(private readonly config: EmailJsConfig) {}

  async sendCode({ email, name, code, expiresInMinutes }: PasswordResetEmail): Promise<void> {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), SEND_TIMEOUT_MS);

    try {
      const response = await fetch(EMAILJS_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          service_id: this.config.serviceId,
          template_id: this.config.templateId,
          user_id: this.config.publicKey,
          template_params: {
            to_email: email,
            to_name: name,
            code,
            expires_in_minutes: expiresInMinutes,
            app_name: 'GymBeam',
          },
        }),
      });
      if (!response.ok) {
        logger.warn('EmailJS rejected the reset email', { status: response.status });
        throw new Error(`EmailJS responded with ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Development stand-in when EmailJS isn't configured: the code goes to the Metro log. */
export class DevLogMailer implements PasswordResetMailer {
  async sendCode({ email, code }: PasswordResetEmail): Promise<void> {
    logger.debug('EmailJS is not configured — password reset code', { email, code });
  }
}

export function createPasswordResetMailer(): PasswordResetMailer | null {
  if (env.emailJs) return new EmailJsMailer(env.emailJs);
  return env.isDevelopment ? new DevLogMailer() : null;
}
