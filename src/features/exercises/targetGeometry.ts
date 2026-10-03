import type { TargetPoint } from '@/types/domain';

export const GRID_COLUMNS = 6;
export const GRID_ROWS = 6;
export const SNAP_STEP_METERS = 0.5;

const X_MIN = -GRID_COLUMNS / 2;
const X_MAX = GRID_COLUMNS / 2;
const Y_MIN = 0;
const Y_MAX = GRID_ROWS;

function snap(value: number, min: number, max: number): number {
  const snapped = Math.round(value / SNAP_STEP_METERS) * SNAP_STEP_METERS;
  return Math.min(max, Math.max(min, snapped));
}

export function snapToGrid(point: TargetPoint): TargetPoint {
  return { x: snap(point.x, X_MIN, X_MAX), y: snap(point.y, Y_MIN, Y_MAX) };
}

export function distanceFromDevice(point: TargetPoint): number {
  return Math.hypot(point.x, point.y);
}

export function angleFromDevice(point: TargetPoint): number {
  const degrees = (Math.atan2(point.y, point.x) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}

export function findTargetNear(
  targets: TargetPoint[],
  point: TargetPoint,
  radiusMeters: number,
): number {
  let bestIndex = -1;
  let bestDistance = radiusMeters;
  targets.forEach((target, index) => {
    const distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (distance <= bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return bestIndex;
}
