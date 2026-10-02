import {
  buildDrillCommand,
  buildPreviewCommand,
  buildStopCommand,
  buildTimeCommand,
  normalizeDrillResult,
  normalizeSystemInfo,
  parsePiMessage,
} from '@/services/device-transport/piProtocol';

describe('outbound command builders', () => {
  it('buildDrillCommand matches the Pi firmware wire shape exactly, including the "cordinates" field name', () => {
    expect(
      buildDrillCommand('Demo drill', [
        { x: 1, y: 1 },
        { x: -1.5, y: 2 },
      ]),
    ).toEqual({
      command: 'Drill',
      name: 'Demo drill',
      coordinateCount: 2,
      cordinates: [
        [1, 1],
        [-1.5, 2],
      ],
    });
  });

  it('buildPreviewCommand uses the Drill_preview command', () => {
    expect(buildPreviewCommand('Preview', [{ x: 0, y: 0 }])).toMatchObject({
      command: 'Drill_preview',
      coordinateCount: 1,
    });
  });

  it('buildStopCommand sends only the command field', () => {
    expect(buildStopCommand()).toEqual({ command: 'Drill_Stop' });
  });

  it('buildTimeCommand formats every field as a string, month 1-indexed', () => {
    const date = new Date(2026, 0, 5, 14, 30, 0); // Jan 5 2026, 14:30:00 — JS months are 0-indexed
    expect(buildTimeCommand(date)).toEqual({
      command: 'Time',
      year: '2026',
      month: '1',
      date: '5',
      hour: '14',
      minutes: '30',
      second: '0',
    });
  });
});

describe('parsePiMessage', () => {
  it('classifies a device_info message', () => {
    const raw = {
      type: 'device_info',
      device_id: 'abc',
      device_name: 'GymBeam-01',
      device_type: 'trainer',
      mac_addr: '00:11:22:33:44:55',
      device_manufature: 'GymBeam',
    };
    expect(parsePiMessage(raw)).toEqual({ kind: 'device_info', data: raw });
  });

  it('classifies a system_info message', () => {
    const raw = {
      type: 'system_info',
      cpuUsage: 12,
      memoryUsage: 34,
      diskUsage: 56,
      temperature: 45.2,
      uptime: 1000,
    };
    expect(parsePiMessage(raw)).toEqual({ kind: 'system_info', data: raw });
  });

  it('classifies a Drill_result message with dynamic pointN fields', () => {
    const raw = { type: 'Drill_result', name: 'Demo', coordinateCount: 2, point0: 1.1, point1: 2.2 };
    expect(parsePiMessage(raw)).toEqual({ kind: 'drill_result', data: raw });
  });

  it('falls back to unknown for anything unrecognized rather than throwing', () => {
    expect(parsePiMessage({ type: 'something_new' })).toEqual({
      kind: 'unknown',
      raw: { type: 'something_new' },
    });
    expect(parsePiMessage(null)).toEqual({ kind: 'unknown', raw: null });
  });
});

describe('normalizeSystemInfo', () => {
  it('maps Pi field names to the DeviceSystemMetrics shape', () => {
    const metrics = normalizeSystemInfo({
      type: 'system_info',
      cpuUsage: 12,
      memoryUsage: 34,
      diskUsage: 56,
      temperature: 45.2,
      uptime: 1000,
    });
    expect(metrics.cpuUsagePercent).toBe(12);
    expect(metrics.memoryUsagePercent).toBe(34);
    expect(metrics.diskUsagePercent).toBe(56);
    expect(metrics.temperatureCelsius).toBe(45.2);
    expect(metrics.uptimeSeconds).toBe(1000);
    expect(typeof metrics.reportedAt).toBe('string');
  });
});

describe('normalizeDrillResult', () => {
  it('extracts only pointN metrics and tags the event as ROUND_COMPLETED (a lap, not the whole session)', () => {
    const event = normalizeDrillResult(
      { type: 'Drill_result', name: 'Demo', coordinateCount: 2, point0: 1.1, point1: 2.2 },
      'session-1',
    );
    expect(event.eventType).toBe('ROUND_COMPLETED');
    expect(event.sessionId).toBe('session-1');
    expect(event.metrics).toEqual({ point0: 1.1, point1: 2.2 });
  });
});
