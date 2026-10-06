import {
  applyTelemetry,
  type DrillRecording,
  startRecording,
} from '@/features/history/drillRecorder';
import type { DrillSessionRecord } from '@/types/domain';
import { createTelemetryEvent, type CreateTelemetryEventInput } from '@/types/telemetry';

const TARGETS = [
  { x: 1, y: 0 },
  { x: 1, y: 2 },
];

function event(eventType: CreateTelemetryEventInput['eventType'], extra = {}, sessionId = 's1') {
  return createTelemetryEvent({ sessionId, eventType, state: null, ...extra });
}

function start(isMock = false): DrillRecording {
  return startRecording(
    { name: 'Custom drill', targets: TARGETS, isMock },
    event('SESSION_STARTED'),
  );
}

/** Feeds events in order and returns whatever the session finished as. */
function run(
  recording: DrillRecording,
  events: ReturnType<typeof event>[],
): DrillSessionRecord | null {
  let current: DrillRecording | null = recording;
  let finished: DrillSessionRecord | null = null;
  for (const e of events) {
    if (!current) break;
    const step = applyTelemetry(current, e);
    current = step.recording;
    finished = step.finished ?? finished;
  }
  return finished;
}

describe('drillRecorder', () => {
  it('records one run per lap the Pi reports, until the drill is stopped', () => {
    const finished = run(start(), [
      event('ROUND_COMPLETED', { metrics: { point0: 1.234, point1: 0.9 } }),
      event('ROUND_COMPLETED', { metrics: { point0: 1.1, point1: 0.8 } }),
      event('SESSION_STOPPED'),
    ]);

    expect(finished?.runs).toEqual([
      { targetTimesSeconds: [1.23, 0.9], missedTargets: 0 },
      { targetTimesSeconds: [1.1, 0.8], missedTargets: 0 },
    ]);
    expect(finished).toMatchObject({ id: 's1', name: 'Custom drill', targets: TARGETS });
  });

  it('builds a run from target-by-target results, counting misses', () => {
    const finished = run(start(true), [
      event('TARGET_REACHED', { targetIndex: 0, metrics: { reactionTimeMs: 800 } }),
      event('TARGET_MISSED', { targetIndex: 1, metrics: { reactionTimeMs: 1150 } }),
      event('SESSION_COMPLETED'),
    ]);

    expect(finished?.runs).toEqual([{ targetTimesSeconds: [0.8, 1.15], missedTargets: 1 }]);
    expect(finished?.isMock).toBe(true);
  });

  it('keeps the laps already timed when the device disconnects mid-drill', () => {
    const finished = run(start(), [
      event('ROUND_COMPLETED', { metrics: { point0: 1, point1: 1 } }),
      event('DEVICE_DISCONNECTED'),
    ]);

    expect(finished?.runs).toHaveLength(1);
  });

  it('saves nothing for a drill stopped before any target was timed', () => {
    const step = applyTelemetry(start(), event('SESSION_STOPPED'));

    expect(step).toEqual({ recording: null, finished: null });
  });

  it('ignores events from another session, such as a preview', () => {
    const recording = start();
    const step = applyTelemetry(recording, event('SESSION_COMPLETED', {}, 'preview'));

    expect(step).toEqual({ recording, finished: null });
  });
});
