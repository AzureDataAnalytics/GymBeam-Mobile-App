import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  EXPO_PUBLIC_ENABLE_MOCK_DEVICE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  EXPO_PUBLIC_BEACON_UUID: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
  EXPO_PUBLIC_ENABLE_MOCK_DEVICE: process.env.EXPO_PUBLIC_ENABLE_MOCK_DEVICE,
  EXPO_PUBLIC_BEACON_UUID: process.env.EXPO_PUBLIC_BEACON_UUID,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration. Copy .env.example to .env and fill it in.\n${parsed.error.toString()}`,
  );
}

export const env = {
  environment: parsed.data.EXPO_PUBLIC_ENVIRONMENT,
  enableMockDevice: parsed.data.EXPO_PUBLIC_ENABLE_MOCK_DEVICE,
  beaconUuid: parsed.data.EXPO_PUBLIC_BEACON_UUID,
  isDevelopment: parsed.data.EXPO_PUBLIC_ENVIRONMENT === 'development',
  isProduction: parsed.data.EXPO_PUBLIC_ENVIRONMENT === 'production',
} as const;
