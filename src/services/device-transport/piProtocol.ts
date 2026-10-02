import { z } from 'zod';

import type { DeviceSystemMetrics, TargetPoint } from '@/types/domain';
import { createTelemetryEvent, type TelemetryEvent } from '@/types/telemetry';

/**
 * The Pi's actual wire protocol, reconstructed from
 * GymBeamDevice/3B-WorkingCode/{blu.py,main.py} — see
 * docs/device-integration.md for the narrative version. Field names that
 * look like typos (`cordinates`, `device_manufature`) are preserved
 * verbatim because they're literally what the Python firmware reads/writes;
 * "fixing" them here would break real hardware.
 */

// ---------------------------------------------------------------------------
// Outbound: phone -> Pi
// ---------------------------------------------------------------------------

export function buildDrillCommand(name: string, targets: TargetPoint[]) {
  return {
    command: 'Drill' as const,
    name,
    coordinateCount: targets.length,
    cordinates: targets.map((t) => [t.x, t.y]),
  };
}

export function buildPreviewCommand(name: string, targets: TargetPoint[]) {
  return {
    command: 'Drill_preview' as const,
    name,
    coordinateCount: targets.length,
    cordinates: targets.map((t) => [t.x, t.y]),
  };
}

export function buildStopCommand() {
  return { command: 'Drill_Stop' as const };
}

/**
 * The Pi only replies with `device_info` once it has received a `Time`
 * command (see main.py's main loop) — the legacy Flutter app sends this
 * immediately after connecting for exactly that reason
 * (blu_api.dart::connect calls sendTime() then awaits the device_info
 * reply). This transport does the same handshake on connect().
 */
export function buildTimeCommand(date: Date) {
  return {
    command: 'Time' as const,
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
    date: String(date.getDate()),
    hour: String(date.getHours()),
    minutes: String(date.getMinutes()),
    second: String(date.getSeconds()),
  };
}

// ---------------------------------------------------------------------------
// Inbound: Pi -> phone
// ---------------------------------------------------------------------------

const deviceInfoSchema = z.object({
  type: z.literal('device_info'),
  device_id: z.string(),
  device_name: z.string(),
  device_type: z.string(),
  mac_addr: z.string(),
  device_manufature: z.string(), // sic — matches the Pi firmware's actual (misspelled) field name
});

const systemInfoSchema = z.object({
  type: z.literal('system_info'),
  cpuUsage: z.number(),
  memoryUsage: z.number(),
  diskUsage: z.number(),
  temperature: z.number(),
  uptime: z.number(),
});

// `pointN` keys are dynamic (one per target in the drill), hence `.catchall`.
// The catchall type is widened to `string | number` (rather than just
// `number`) purely so the named fields above — which are strings/numbers —
// satisfy TypeScript's index-signature compatibility check; the pointN
// values are still confirmed numeric at runtime in normalizeDrillResult.
const drillResultSchema = z
  .object({
    type: z.literal('Drill_result'),
    name: z.string(),
    coordinateCount: z.number(),
  })
  .catchall(z.union([z.string(), z.number()]));

export type PiDeviceInfo = z.infer<typeof deviceInfoSchema>;
export type PiSystemInfo = z.infer<typeof systemInfoSchema>;
export type PiDrillResult = z.infer<typeof drillResultSchema>;

export type ParsedPiMessage =
  | { kind: 'device_info'; data: PiDeviceInfo }
  | { kind: 'system_info'; data: PiSystemInfo }
  | { kind: 'drill_result'; data: PiDrillResult }
  | { kind: 'unknown'; raw: unknown };

/** Routes one already-JSON-parsed object (see JsonStreamFramer) to its schema. */
export function parsePiMessage(raw: unknown): ParsedPiMessage {
  const deviceInfo = deviceInfoSchema.safeParse(raw);
  if (deviceInfo.success) return { kind: 'device_info', data: deviceInfo.data };

  const systemInfo = systemInfoSchema.safeParse(raw);
  if (systemInfo.success) return { kind: 'system_info', data: systemInfo.data };

  const drillResult = drillResultSchema.safeParse(raw);
  if (drillResult.success) return { kind: 'drill_result', data: drillResult.data };

  return { kind: 'unknown', raw };
}

export function normalizeSystemInfo(data: PiSystemInfo): DeviceSystemMetrics {
  return {
    cpuUsagePercent: data.cpuUsage,
    memoryUsagePercent: data.memoryUsage,
    diskUsagePercent: data.diskUsage,
    temperatureCelsius: data.temperature,
    uptimeSeconds: data.uptime,
    reportedAt: new Date().toISOString(),
  };
}

/**
 * The Pi's drill loop (main.py::runDrill) repeats the full target sequence
 * until it receives Drill_Stop — it sends one Drill_result per lap, not one
 * per whole session. That's why this maps to ROUND_COMPLETED (one lap),
 * not SESSION_COMPLETED — the session is still running afterwards.
 */
export function normalizeDrillResult(data: PiDrillResult, sessionId: string): TelemetryEvent {
  const metrics: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('point') && typeof value === 'number') {
      metrics[key] = value;
    }
  }

  return createTelemetryEvent({ sessionId, eventType: 'ROUND_COMPLETED', state: 'busy', metrics });
}
