import {
  angleFromDevice,
  distanceFromDevice,
  findTargetNear,
  snapToGrid,
} from '@/features/exercises/targetGeometry';

describe('targetGeometry', () => {
  it('snaps to the nearest half meter and clamps inside the grid', () => {
    expect(snapToGrid({ x: 1.2, y: 2.8 })).toEqual({ x: 1, y: 3 });
    expect(snapToGrid({ x: -9, y: 7.4 })).toEqual({ x: -3, y: 6 });
    expect(snapToGrid({ x: 0.3, y: -1 })).toEqual({ x: 0.5, y: 0 });
  });

  it('measures distance from the device in meters', () => {
    expect(distanceFromDevice({ x: 3, y: 4 })).toBe(5);
  });

  it('measures angle with 0° to the right, 90° ahead, 180° to the left', () => {
    expect(angleFromDevice({ x: 2, y: 0 })).toBeCloseTo(0);
    expect(angleFromDevice({ x: 0, y: 2 })).toBeCloseTo(90);
    expect(angleFromDevice({ x: -1, y: 1 })).toBeCloseTo(135);
    expect(angleFromDevice({ x: -2, y: 0 })).toBeCloseTo(180);
  });

  it('finds the closest target within the radius', () => {
    const targets = [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    expect(findTargetNear(targets, { x: 0.9, y: 1.1 }, 0.4)).toBe(1);
    expect(findTargetNear(targets, { x: 2.5, y: 4 }, 0.4)).toBe(-1);
  });
});
