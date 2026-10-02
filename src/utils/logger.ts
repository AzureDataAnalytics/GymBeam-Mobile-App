import { env } from '@/constants/env';

/**
 * Structured logger (spec section 31). Debug logs are dropped entirely in
 * production builds. Never pass tokens, passwords, or full request/response
 * bodies that might contain them — pass identifiers and status codes instead.
 */
type LogFields = Record<string, unknown>;

function format(scope: string, message: string, fields?: LogFields) {
  return fields ? `[${scope}] ${message} ${JSON.stringify(fields)}` : `[${scope}] ${message}`;
}

export function createLogger(scope: string) {
  return {
    debug(message: string, fields?: LogFields) {
      if (!env.isDevelopment) return;
      console.debug(format(scope, message, fields));
    },
    info(message: string, fields?: LogFields) {
      console.info(format(scope, message, fields));
    },
    warn(message: string, fields?: LogFields) {
      console.warn(format(scope, message, fields));
    },
    error(message: string, fields?: LogFields) {
      console.error(format(scope, message, fields));
    },
  };
}
