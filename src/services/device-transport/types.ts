import type { DeviceConnectionState, DeviceSystemMetrics, TargetPoint } from '@/types/domain';
import type { TelemetryEvent } from '@/types/telemetry';

export type DeviceStateListener = (state: DeviceConnectionState) => void;
export type TelemetryListener = (event: TelemetryEvent) => void;
export type SystemMetricsListener = (metrics: DeviceSystemMetrics) => void;
export type Unsubscribe = () => void;

export type DrillSpec = {
  name: string;
  targets: TargetPoint[];
};

/**
 * Transport-agnostic contract for talking to a paired device. The Pi remains
 * authoritative for hardware/safety state (spec section 1) — this interface
 * only ever *requests* actions and *observes* state; it never asserts that a
 * request succeeded until the transport reports a matching state change.
 *
 * Implementations:
 *  - MockDeviceTransport: safe, always available, simulates a full drill run.
 *  - BluetoothClassicTransport: real hardware over RFCOMM/SPP, Android only,
 *    requires a custom EAS development client (not available in Expo Go).
 *
 * iOS has no real implementation yet — CoreBluetooth cannot open classic SPP
 * sockets to third-party accessories. See docs/device-integration.md.
 */
export type DeviceTransport = {
  readonly id: string;
  readonly isMock: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  getConnectionState(): DeviceConnectionState;
  onStateChange(listener: DeviceStateListener): Unsubscribe;
  onTelemetry(listener: TelemetryListener): Unsubscribe;
  /** The Pi reports CPU/mem/disk/temp/uptime independently of any drill (every 60s on real hardware). */
  onSystemMetrics(listener: SystemMetricsListener): Unsubscribe;

  sendDrill(spec: DrillSpec): Promise<void>;
  previewDrill(spec: DrillSpec): Promise<void>;
  stopDrill(): Promise<void>;
};

export class DeviceTransportUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'DeviceTransportUnavailableError';
  }
}
