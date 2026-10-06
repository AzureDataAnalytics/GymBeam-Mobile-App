import type { DrillRun, DrillSessionRecord, TargetPoint } from '@/types/domain';

export type SpeedKmph = {
  high: number;
  avg: number;
  low: number;
};

export type DrillSessionSummary = {
  runs: number;
  distanceMeters: number;
  activeSeconds: number;
  avgSpeedKmph: number;
  fastestTargetSeconds: number | null;
  missedTargets: number;
};

/** Leg lengths in meters along the path the run map draws: device, then each target in order. */
function legDistancesMeters(targets: TargetPoint[]): number[] {
  return targets.map((target, index) => {
    const from = index === 0 ? { x: 0, y: 0 } : targets[index - 1]!;
    return Math.hypot(target.x - from.x, target.y - from.y);
  });
}

function toKmph(meters: number, seconds: number): number {
  return seconds > 0 ? Math.round((meters / seconds) * 3.6 * 10) / 10 : 0;
}

export function runSpeedKmph(targets: TargetPoint[], run: DrillRun): SpeedKmph {
  const legs = legDistancesMeters(targets)
    .map((meters, index) => ({ meters, seconds: run.targetTimesSeconds[index] ?? 0 }))
    .filter((leg) => leg.seconds > 0);
  if (legs.length === 0) {
    return { high: 0, avg: 0, low: 0 };
  }

  const speeds = legs.map((leg) => toKmph(leg.meters, leg.seconds));
  return {
    high: Math.max(...speeds),
    avg: toKmph(sum(legs.map((leg) => leg.meters)), sum(legs.map((leg) => leg.seconds))),
    low: Math.min(...speeds),
  };
}

export function summarizeSession(session: DrillSessionRecord): DrillSessionSummary {
  const times = session.runs.flatMap((run) => run.targetTimesSeconds).filter((s) => s > 0);
  const distanceMeters = sum(legDistancesMeters(session.targets)) * session.runs.length;
  const activeSeconds = sum(times);

  return {
    runs: session.runs.length,
    distanceMeters,
    activeSeconds,
    avgSpeedKmph: toKmph(distanceMeters, activeSeconds),
    fastestTargetSeconds: times.length > 0 ? Math.min(...times) : null,
    missedTargets: sum(session.runs.map((run) => run.missedTargets)),
  };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters.toFixed(1)} m` : `${(meters / 1000).toFixed(2)} km`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
