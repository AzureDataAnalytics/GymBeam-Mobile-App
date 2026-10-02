/**
 * Core domain types shared across the app. These describe the target model —
 * some (User, DrillHistoryEntry) map onto data the existing GymBeam Drupal
 * backend already returns; others (Exercise, Pattern, Session, Telemetry)
 * describe a contract that does not exist server-side yet and is documented
 * in docs/api-integration.md. Screens built against the latter must go
 * through the mock adapters in src/services/mock until a real endpoint
 * exists — see src/services/device-transport and src/api.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

/** A point in the training area, in meters, relative to device center. See AppConfigData in the legacy Flutter app: an 8m-diameter work area. */
export interface TargetPoint {
  x: number;
  y: number;
}

export interface Pattern {
  id: string;
  name: string;
  targets: TargetPoint[];
  createdAt: string;
  updatedAt: string;
}

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty: ExerciseDifficulty;
  estimatedDurationSeconds: number;
  targetCount: number;
  sets: number;
  rounds: number;
  restSeconds: number;
  patternId: string;
  tags: string[];
  isFavorite: boolean;
}

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

export interface DeviceSystemMetrics {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  temperatureCelsius: number;
  uptimeSeconds: number;
  reportedAt: string;
}

export interface PairedDevice {
  id: string;
  name: string;
  macAddress: string;
  deviceType: string;
  manufacturer: string;
  connectionState: DeviceConnectionState;
  lastSeenAt: string | null;
  metrics: DeviceSystemMetrics | null;
  isMock: boolean;
}

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

export interface SessionResult {
  sessionId: string;
  exerciseId: string;
  startedAt: string;
  completedAt: string;
  targetsAttempted: number;
  targetsCompleted: number;
  targetsMissed: number;
  averageTargetTimeMs: number;
  fastestTargetTimeMs: number | null;
  slowestTargetTimeMs: number | null;
  estimatedCaloriesBurned: number | null;
}

export interface DrillHistoryEntry {
  id: string;
  name: string;
  recordedAt: string;
  totalPoints: number;
  durationSeconds: number;
  intensity: 'low' | 'medium' | 'high';
  notes: string | null;
}
