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


export type DeviceTransport = {
  readonly id: string;
  readonly isMock: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  getConnectionState(): DeviceConnectionState;
  onStateChange(listener: DeviceStateListener): Unsubscribe;
  onTelemetry(listener: TelemetryListener): Unsubscribe;
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
