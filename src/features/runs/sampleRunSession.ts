import type { TargetPoint } from '@/types/domain';



export type RunSample = {
  targets: TargetPoint[];
  targetTimesSeconds: number[];
  speedKmph: { high: number; avg: number; low: number };
};

export type RunSessionSummary = {
  runs: number;
  distanceKm: number;
  activeTimeHours: number;
  avgSpeedKmph: number;
  consistencyPercent: number;
  reflexScore: number;
};

const BASE_TARGETS: TargetPoint[] = [
  { x: -1, y: 1.3 },
  { x: -1.2, y: 0.2 },
  { x: -1, y: -1.1 },
  { x: 1.1, y: -0.3 },
  { x: 0.6, y: 1.3 },
];

export const SAMPLE_RUNS: RunSample[] = [
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [1.22, 0.1, 1.63, 1.9, 1.63],
    speedKmph: { high: 9.2, avg: 9.2, low: 9.2 },
  },
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [1.1, 0.9, 1.4, 1.7, 1.5],
    speedKmph: { high: 9.8, avg: 8.6, low: 7.1 },
  },
  {
    targets: [...BASE_TARGETS, { x: 2, y: -1.8 }, { x: -2.2, y: -2.2 }, { x: 0, y: 3 }],
    targetTimesSeconds: [1.3, 1.05, 1.5, 1.6, 1.2, 2.1, 1.8, 2.4],
    speedKmph: { high: 10.4, avg: 8.9, low: 6.8 },
  },
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [0.95, 1.2, 1.35, 1.45, 1.1],
    speedKmph: { high: 9.5, avg: 8.2, low: 6.9 },
  },
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [1.4, 1.3, 1.6, 1.75, 1.45],
    speedKmph: { high: 8.7, avg: 7.4, low: 6.2 },
  },
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [1.0, 0.85, 1.25, 1.5, 1.3],
    speedKmph: { high: 9.9, avg: 8.8, low: 7.5 },
  },
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [1.15, 1.0, 1.45, 1.65, 1.4],
    speedKmph: { high: 9.1, avg: 7.9, low: 6.6 },
  },
  {
    targets: BASE_TARGETS,
    targetTimesSeconds: [1.25, 1.1, 1.5, 1.8, 1.55],
    speedKmph: { high: 8.9, avg: 7.7, low: 6.4 },
  },
];

export const SAMPLE_SUMMARY: RunSessionSummary = {
  runs: SAMPLE_RUNS.length,
  distanceKm: 0.5,
  activeTimeHours: 0.5,
  avgSpeedKmph: 7.7,
  consistencyPercent: 56.2,
  reflexScore: 3.5,
};
