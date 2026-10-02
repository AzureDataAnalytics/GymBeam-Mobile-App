import type { SessionState } from '@/types/domain';
import type { TelemetryEventType } from '@/types/telemetry';

/**
 * Pure transition function for the session state machine (spec section 16).
 * Kept isolated from React/zustand so it's trivially unit-testable and so the
 * UI never has to guess a transition — it only ever reflects one that an
 * actual telemetry event reported.
 */
export function nextSessionState(
  current: SessionState,
  eventType: TelemetryEventType,
): SessionState {
  switch (eventType) {
    case 'SESSION_STARTED':
      return 'running';
    case 'SESSION_COMPLETED':
      return 'completed';
    case 'SESSION_STOPPED':
      return 'idle';
    case 'PAUSED':
      return 'paused';
    case 'RESUMED':
      return 'running';
    case 'ERROR':
      return 'error';
    case 'DEVICE_DISCONNECTED':
      return 'disconnected';
    case 'DEVICE_CONNECTED':
      return current === 'disconnected' ? 'ready' : current;
    default:
      return current;
  }
}
