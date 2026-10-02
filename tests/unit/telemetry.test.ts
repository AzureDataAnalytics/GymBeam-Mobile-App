import { parseTelemetryEvent, TELEMETRY_SCHEMA_VERSION } from '@/types/telemetry';

const validEvent = {
  schemaVersion: TELEMETRY_SCHEMA_VERSION,
  eventId: 'evt-1',
  sessionId: 'sess-1',
  eventType: 'TARGET_REACHED',
  timestamp: new Date().toISOString(),
  deviceTimestamp: null,
  targetId: 'target-0',
  targetIndex: 0,
  coordinates: { x: 1, y: 1 },
  state: 'busy',
  metrics: { reactionTimeMs: 420 },
};

describe('parseTelemetryEvent', () => {
  it('accepts a well-formed event', () => {
    expect(parseTelemetryEvent(validEvent)).toEqual(validEvent);
  });

  it('rejects an unknown event type rather than passing it through', () => {
    expect(parseTelemetryEvent({ ...validEvent, eventType: 'NOT_A_REAL_EVENT' })).toBeNull();
  });

  it('rejects a mismatched schema version instead of silently accepting it', () => {
    expect(parseTelemetryEvent({ ...validEvent, schemaVersion: 999 })).toBeNull();
  });

  it('rejects malformed input instead of throwing', () => {
    expect(parseTelemetryEvent(null)).toBeNull();
    expect(parseTelemetryEvent('not an object')).toBeNull();
    expect(parseTelemetryEvent({})).toBeNull();
  });
});
