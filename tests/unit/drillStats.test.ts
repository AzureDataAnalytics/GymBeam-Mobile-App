import {
  formatDistance,
  formatDuration,
  runSpeedKmph,
  summarizeSession,
} from '@/features/history/drillStats';
import type { DrillSessionRecord } from '@/types/domain';

// Legs: device -> (3,4) is 5 m, then (3,4) -> (3,0) is 4 m.
const TARGETS = [
  { x: 3, y: 4 },
  { x: 3, y: 0 },
];

const SESSION: DrillSessionRecord = {
  id: 's1',
  name: 'Custom drill',
  startedAt: '2026-10-05T10:00:00.000Z',
  endedAt: '2026-10-05T10:01:00.000Z',
  targets: TARGETS,
  runs: [
    { targetTimesSeconds: [2, 2], missedTargets: 0 },
    { targetTimesSeconds: [2.5, 1], missedTargets: 1 },
  ],
  isMock: false,
};

describe('drillStats', () => {
  it('derives per-leg speeds from distance and time', () => {
    expect(runSpeedKmph(TARGETS, SESSION.runs[0]!)).toEqual({ high: 9, avg: 8.1, low: 7.2 });
  });

  it('reports zero speed rather than dividing by a missing time', () => {
    expect(runSpeedKmph(TARGETS, { targetTimesSeconds: [0, 0], missedTargets: 0 })).toEqual({
      high: 0,
      avg: 0,
      low: 0,
    });
  });

  it('totals a session across its runs', () => {
    expect(summarizeSession(SESSION)).toEqual({
      runs: 2,
      distanceMeters: 18,
      activeSeconds: 7.5,
      avgSpeedKmph: 8.6,
      fastestTargetSeconds: 1,
      missedTargets: 1,
    });
  });

  it('formats durations and distances for display', () => {
    expect(formatDuration(7.5)).toBe('7.5 s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDistance(18)).toBe('18.0 m');
    expect(formatDistance(1500)).toBe('1.50 km');
  });
});
