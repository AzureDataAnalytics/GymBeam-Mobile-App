import { z } from 'zod';

/**
 * All EXPO_PUBLIC_* vars are inlined at build time and ship inside the client
 * bundle — never put secrets here.
 *
 * There is no backend right now (that's a deliberate, later phase — see
 * docs/api-integration.md). This config intentionally has no API/WS URL
 * until that phase starts; everything today is either on-device (auth,
 * storage) or device-transport (mock, or Bluetooth Classic later).
 */
const envSchema = z.object({
  EXPO_PUBLIC_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  EXPO_PUBLIC_ENABLE_MOCK_DEVICE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
  EXPO_PUBLIC_ENABLE_MOCK_DEVICE: process.env.EXPO_PUBLIC_ENABLE_MOCK_DEVICE,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration. Copy .env.example to .env and fill it in.\n${parsed.error.toString()}`,
  );
}

export const env = {
  environment: parsed.data.EXPO_PUBLIC_ENVIRONMENT,
  enableMockDevice: parsed.data.EXPO_PUBLIC_ENABLE_MOCK_DEVICE,
  isDevelopment: parsed.data.EXPO_PUBLIC_ENVIRONMENT === 'development',
  isProduction: parsed.data.EXPO_PUBLIC_ENVIRONMENT === 'production',
} as const;
