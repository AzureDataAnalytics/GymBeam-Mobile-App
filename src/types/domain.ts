/** Core domain types shared across the app. Everything here lives on the phone or the device. */

export type User = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

/** A point in the training area, in meters, relative to device center. See AppConfigData in the legacy Flutter app: an 8m-diameter work area. */
export type TargetPoint = {
  x: number;
  y: number;
};

/**
 * Device connectivity/hardware state as reported by the transport layer.
 * Mirrors spec section 13. `unsupported` covers iOS today, where no real
 * transport exists yet — see docs/device-integration.md.
 */
export type DeviceConnectionState =
  | 'offline'
  | 'connecting'
  | 'online'
  | 'ready'
  | 'busy'
  | 'warning'
  | 'error'
  | 'emergency_stop'
  | 'unsupported';

export type DeviceSystemMetrics = {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  temperatureCelsius: number;
  uptimeSeconds: number;
  reportedAt: string;
};

export type PairedDevice = {
  id: string;
  name: string;
  macAddress: string;
  deviceType: string;
  manufacturer: string;
  connectionState: DeviceConnectionState;
  lastSeenAt: string | null;
  metrics: DeviceSystemMetrics | null;
  isMock: boolean;
};

/**
 * Session state machine (spec section 16). The mobile UI reflects these but
 * never assumes a transition happened just because it sent a command — every
 * transition here is driven by a transport event, not a local optimistic set.
 */
export type SessionState =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'completed'
  | 'error'
  | 'disconnected'
  | 'emergency_stop';

/** One pass through a drill's targets, as timed by the device. */
export type DrillRun = {
  /** Seconds taken to reach each target, in target order. */
  targetTimesSeconds: number[];
  missedTargets: number;
};

/**
 * A session holds one run per lap: the Pi repeats the target sequence until
 * it is stopped, and reports each lap separately.
 */
export type DrillSessionRecord = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string;
  targets: TargetPoint[];
  runs: DrillRun[];
  isMock: boolean;
};
