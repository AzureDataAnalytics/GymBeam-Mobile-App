import type { DeviceConnectionState, DeviceSystemMetrics } from '@/types/domain';
import { createTelemetryEvent, type TelemetryEvent } from '@/types/telemetry';

import type {
  DeviceStateListener,
  DeviceTransport,
  DrillSpec,
  SystemMetricsListener,
  TelemetryListener,
  Unsubscribe,
} from './types';

/**
 * Simulated device for development, demos, App Store screenshots, and iOS
 * (which has no real transport yet). This NEVER talks to real hardware — it
 * only ever generates events in memory. Per spec section 46/47, callers must
 * surface `isMock` in the UI so nobody mistakes a simulated run for a real
 * one.
 */
export class MockDeviceTransport implements DeviceTransport {
  readonly id = 'mock-gymbeam-device';
  readonly isMock = true;

  private state: DeviceConnectionState = 'offline';
  private stateListeners = new Set<DeviceStateListener>();
  private telemetryListeners = new Set<TelemetryListener>();
  private systemMetricsListeners = new Set<SystemMetricsListener>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private activeSessionId: string | null = null;

  async connect(): Promise<void> {
    this.setState('connecting');
    await delay(400);
    this.setState('online');
    await delay(200);
    this.setState('ready');
    this.emitSystemMetrics();
    this.metricsInterval = setInterval(() => this.emitSystemMetrics(), 15_000);
  }

  async disconnect(): Promise<void> {
    this.clearTimers();
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.setState('offline');
  }

  getConnectionState(): DeviceConnectionState {
    return this.state;
  }

  onStateChange(listener: DeviceStateListener): Unsubscribe {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onTelemetry(listener: TelemetryListener): Unsubscribe {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  onSystemMetrics(listener: SystemMetricsListener): Unsubscribe {
    this.systemMetricsListeners.add(listener);
    return () => this.systemMetricsListeners.delete(listener);
  }

  async sendDrill(spec: DrillSpec): Promise<void> {
    if (this.state !== 'ready') {
      throw new Error(`Cannot start a drill while device is "${this.state}"`);
    }

    this.clearTimers();
    this.setState('busy');
    const sessionId = `mock-session-${Date.now()}`;
    this.activeSessionId = sessionId;

    this.emitTelemetry(sessionId, 'SESSION_STARTED', {});

    spec.targets.forEach((target, index) => {
      const showAt = index * 1400;
      const resolveAt = showAt + 700 + Math.random() * 500;

      this.schedule(showAt, () => {
        this.emitTelemetry(sessionId, 'TARGET_SHOWN', {
          targetId: `target-${index}`,
          targetIndex: index,
          coordinates: target,
        });
      });

      this.schedule(resolveAt, () => {
        const missed = Math.random() < 0.08;
        this.emitTelemetry(sessionId, missed ? 'TARGET_MISSED' : 'TARGET_REACHED', {
          targetId: `target-${index}`,
          targetIndex: index,
          coordinates: target,
          metrics: { reactionTimeMs: resolveAt - showAt },
        });
      });
    });

    const completeAt = spec.targets.length * 1400 + 800;
    this.schedule(completeAt, () => {
      this.emitTelemetry(sessionId, 'SESSION_COMPLETED', {});
      this.activeSessionId = null;
      this.setState('ready');
    });
  }

  async previewDrill(spec: DrillSpec): Promise<void> {
    if (this.state !== 'ready') {
      throw new Error(`Cannot preview a drill while device is "${this.state}"`);
    }

    this.setState('busy');
    spec.targets.forEach((target, index) => {
      this.schedule(index * 1000, () => {
        this.emitTelemetry('preview', 'TARGET_SHOWN', {
          targetId: `preview-${index}`,
          targetIndex: index,
          coordinates: target,
        });
      });
    });
    this.schedule(spec.targets.length * 1000 + 200, () => this.setState('ready'));
  }

  async stopDrill(): Promise<void> {
    this.clearTimers();
    if (this.activeSessionId) {
      this.emitTelemetry(this.activeSessionId, 'SESSION_STOPPED', {});
      this.activeSessionId = null;
    }
    this.setState('ready');
  }

  private setState(next: DeviceConnectionState) {
    this.state = next;
    this.stateListeners.forEach((listener) => listener(next));
  }

  private schedule(delayMs: number, fn: () => void) {
    this.timers.push(setTimeout(fn, delayMs));
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  private emitTelemetry(
    sessionId: string,
    eventType: TelemetryEvent['eventType'],
    partial: Partial<Pick<TelemetryEvent, 'targetId' | 'targetIndex' | 'coordinates' | 'metrics'>>,
  ) {
    const event = createTelemetryEvent({ sessionId, eventType, state: this.state, ...partial });
    this.telemetryListeners.forEach((listener) => listener(event));
  }

  private emitSystemMetrics() {
    const metrics: DeviceSystemMetrics = {
      cpuUsagePercent: 15 + Math.random() * 10,
      memoryUsagePercent: 40 + Math.random() * 10,
      diskUsagePercent: 22,
      temperatureCelsius: 45 + Math.random() * 5,
      uptimeSeconds: Math.floor(Date.now() / 1000) % 100_000,
      reportedAt: new Date().toISOString(),
    };
    this.systemMetricsListeners.forEach((listener) => listener(metrics));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
