import type { DrillRun, DrillSessionRecord, TargetPoint } from '@/types/domain';
import type { TelemetryEvent } from '@/types/telemetry';

/** A drill that is still running, accumulating runs until the session ends. */
export type DrillRecording = {
  id: string;
  name: string;
  startedAt: string;
  targets: TargetPoint[];
  isMock: boolean;
  runs: DrillRun[];
  lapTimesSeconds: (number | undefined)[];
  lapMissedTargets: number;
};

export type RecorderStep = {
  recording: DrillRecording | null;
  finished: DrillSessionRecord | null;
};

type StartRecordingInput = {
  name: string;
  targets: TargetPoint[];
  isMock: boolean;
};

export function startRecording(
  input: StartRecordingInput,
  started: TelemetryEvent,
): DrillRecording {
  return {
    id: started.sessionId,
    name: input.name,
    startedAt: started.timestamp,
    targets: input.targets,
    isMock: input.isMock,
    runs: [],
    lapTimesSeconds: [],
    lapMissedTargets: 0,
  };
}

export function applyTelemetry(recording: DrillRecording, event: TelemetryEvent): RecorderStep {
  if (event.sessionId !== recording.id) {
    return { recording, finished: null };
  }

  switch (event.eventType) {
    case 'TARGET_REACHED':
    case 'TARGET_MISSED': {
      const index = event.targetIndex;
      const reactionTimeMs = event.metrics?.reactionTimeMs;
      if (index === null || reactionTimeMs === undefined) {
        return { recording, finished: null };
      }
      const lapTimesSeconds = [...recording.lapTimesSeconds];
      lapTimesSeconds[index] = roundSeconds(reactionTimeMs / 1000);
      const lapMissedTargets =
        recording.lapMissedTargets + (event.eventType === 'TARGET_MISSED' ? 1 : 0);
      return { recording: { ...recording, lapTimesSeconds, lapMissedTargets }, finished: null };
    }

    case 'ROUND_COMPLETED': {
      const lap = lapFromPointMetrics(recording.targets, event.metrics);
      const next = lap ? { ...recording, runs: [...recording.runs, lap] } : closeLap(recording);
      return { recording: next, finished: null };
    }

    case 'SESSION_COMPLETED':
    case 'SESSION_STOPPED':
    case 'DEVICE_DISCONNECTED':
    case 'ERROR': {
      const closed = closeLap(recording);
      if (closed.runs.length === 0) {
        return { recording: null, finished: null };
      }
      return {
        recording: null,
        finished: {
          id: closed.id,
          name: closed.name,
          startedAt: closed.startedAt,
          endedAt: event.timestamp,
          targets: closed.targets,
          runs: closed.runs,
          isMock: closed.isMock,
        },
      };
    }

    default:
      return { recording, finished: null };
  }
}

function lapFromPointMetrics(
  targets: TargetPoint[],
  metrics: TelemetryEvent['metrics'],
): DrillRun | null {
  if (!metrics || !Object.keys(metrics).some((key) => key.startsWith('point'))) {
    return null;
  }
  return {
    targetTimesSeconds: targets.map((_, index) => roundSeconds(metrics[`point${index}`] ?? 0)),
    missedTargets: 0,
  };
}

/** Turns the target-by-target lap in progress into a run, if it timed anything. */
function closeLap(recording: DrillRecording): DrillRecording {
  if (!recording.lapTimesSeconds.some((seconds) => seconds !== undefined)) {
    return recording;
  }
  const run: DrillRun = {
    targetTimesSeconds: Array.from(recording.lapTimesSeconds, (seconds) => seconds ?? 0),
    missedTargets: recording.lapMissedTargets,
  };
  return { ...recording, runs: [...recording.runs, run], lapTimesSeconds: [], lapMissedTargets: 0 };
}

function roundSeconds(seconds: number): number {
  return Math.round(seconds * 100) / 100;
}
