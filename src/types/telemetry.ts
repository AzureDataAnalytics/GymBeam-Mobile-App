import { z } from 'zod';

/**
 * Typed telemetry event model (spec section 18). Every event carries a schema
 * version so the parser can evolve without breaking older Pi firmware. This
 * is deliberately decoupled from the transport (Bluetooth today, network
 * later) — transports normalize into this shape, nothing downstream ever
 * touches a raw socket payload directly.
 */
export const TELEMETRY_SCHEMA_VERSION = 1;

export const telemetryEventTypeSchema = z.enum([
  'SESSION_STARTED',
  'SESSION_STOPPED',
  'SESSION_COMPLETED',
  'SET_STARTED',
  'SET_COMPLETED',
  'ROUND_STARTED',
  'ROUND_COMPLETED',
  'TARGET_SHOWN',
  'TARGET_REACHED',
  'TARGET_MISSED',
  'TARGET_CHANGED',
  'PAUSED',
  'RESUMED',
  'ERROR',
  'DEVICE_CONNECTED',
  'DEVICE_DISCONNECTED',
]);

export type TelemetryEventType = z.infer<typeof telemetryEventTypeSchema>;

export const telemetryEventSchema = z.object({
  schemaVersion: z.literal(TELEMETRY_SCHEMA_VERSION),
  eventId: z.string(),
  sessionId: z.string(),
  eventType: telemetryEventTypeSchema,
  timestamp: z.string(),
  deviceTimestamp: z.string().nullable(),
  targetId: z.string().nullable(),
  targetIndex: z.number().int().nullable(),
  coordinates: z.object({ x: z.number(), y: z.number() }).nullable(),
  state: z.string().nullable(),
  metrics: z.record(z.string(), z.number()).nullable(),
});

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

export function parseTelemetryEvent(raw: unknown): TelemetryEvent | null {
  const result = telemetryEventSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export type CreateTelemetryEventInput = {
  sessionId: string;
  eventType: TelemetryEventType;
  state: string | null;
  targetId?: string | null;
  targetIndex?: number | null;
  coordinates?: { x: number; y: number } | null;
  metrics?: Record<string, number> | null;
};

/** Shared factory so every DeviceTransport implementation builds identically-shaped events. */
export function createTelemetryEvent(input: CreateTelemetryEventInput): TelemetryEvent {
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    eventId: `${input.sessionId}-${input.eventType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sessionId: input.sessionId,
    eventType: input.eventType,
    timestamp: new Date().toISOString(),
    deviceTimestamp: null,
    targetId: input.targetId ?? null,
    targetIndex: input.targetIndex ?? null,
    coordinates: input.coordinates ?? null,
    state: input.state,
    metrics: input.metrics ?? null,
  };
}
