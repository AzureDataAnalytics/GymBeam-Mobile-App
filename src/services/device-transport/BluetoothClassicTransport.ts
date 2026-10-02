import { Platform } from 'react-native';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import type { DeviceConnectionState } from '@/types/domain';
import { createTelemetryEvent, type TelemetryEvent } from '@/types/telemetry';
import { createLogger } from '@/utils/logger';

import { JsonStreamFramer } from './jsonFraming';
import {
  buildDrillCommand,
  buildPreviewCommand,
  buildStopCommand,
  buildTimeCommand,
  normalizeDrillResult,
  normalizeSystemInfo,
  parsePiMessage,
} from './piProtocol';
import type {
  DeviceStateListener,
  DeviceTransport,
  DrillSpec,
  SystemMetricsListener,
  TelemetryListener,
  Unsubscribe,
} from './types';
import { DeviceTransportUnavailableError } from './types';

const logger = createLogger('device.bluetoothClassic');

/**
 * Real-hardware transport for the existing GymBeam Raspberry Pi firmware
 * (see GymBeamDevice/3B-WorkingCode/blu.py), which runs a classic Bluetooth
 * RFCOMM/SPP server (service UUID 00001101-0000-1000-8000-00805f9b34fb) and
 * exchanges JSON objects with no delimiter between messages. Full protocol
 * reference in docs/device-integration.md.
 *
 * `delimiter: ''` is an explicit, documented opt-in in
 * react-native-bluetooth-classic (verified against the library's own docs,
 * not assumed) that disables its default newline-based message buffering
 * and just forwards whatever bytes were read. `JsonStreamFramer` then
 * reassembles complete JSON objects from that raw byte stream — this means
 * connecting to the Pi's *existing, unmodified* firmware, no Pi-side changes
 * required.
 *
 * Two real protocol gaps, both firmware limitations rather than bugs in this
 * transport (see docs/device-integration.md for the full explanation):
 *  - The Pi sends no ack for a `Drill` (start) or `Drill_Stop` command — the
 *    corresponding SESSION_STARTED/SESSION_STOPPED events emitted here are
 *    optimistic, fired once the write succeeds, not once hardware confirms.
 *  - The Pi's drill loop repeats forever until stopped, sending one
 *    `Drill_result` per lap — so results map to ROUND_COMPLETED, not
 *    SESSION_COMPLETED (the session is still running afterwards).
 *
 * Android only: CoreBluetooth on iOS cannot open classic SPP sockets to
 * third-party accessories, so there is no iOS implementation of this class —
 * see createDeviceTransport.ts.
 */
export class BluetoothClassicTransport implements DeviceTransport {
  readonly id: string;
  readonly isMock = false;

  private state: DeviceConnectionState = 'offline';
  private stateListeners = new Set<DeviceStateListener>();
  private telemetryListeners = new Set<TelemetryListener>();
  private systemMetricsListeners = new Set<SystemMetricsListener>();
  private framer = new JsonStreamFramer();
  private device: BluetoothDevice | null = null;
  private dataSubscription: { remove(): void } | null = null;
  private disconnectSubscription: { remove(): void } | null = null;
  private activeSessionId: string | null = null;

  constructor(private readonly macAddress: string) {
    this.id = `bt-classic-${macAddress}`;
  }

  async connect(): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new DeviceTransportUnavailableError(
        'Bluetooth Classic is Android-only — see docs/device-integration.md for why.',
      );
    }

    this.setState('connecting');

    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        throw new DeviceTransportUnavailableError('Bluetooth is turned off on this phone.');
      }

      const device = await RNBluetoothClassic.connectToDevice(this.macAddress, {
        connectionType: 'delimited',
        delimiter: '',
      });
      this.device = device;
      this.framer.reset();

      this.dataSubscription = device.onDataReceived((event) => this.handleRawData(event.data));
      this.disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected((event) => {
        if (event.device.address === this.macAddress) this.handleUnexpectedDisconnect();
      });

      this.setState('online');

      // Handshake: the Pi only replies with device_info once it has received
      // a Time command (see main.py's main loop) — mirroring what the
      // legacy app's blu_api.dart::connect does immediately after connecting.
      await device.write(JSON.stringify(buildTimeCommand(new Date())));

      this.setState('ready');
    } catch (error) {
      this.setState('error');
      logger.error('connect failed', { message: (error as Error)?.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.teardownSubscriptions();
    this.framer.reset();
    if (this.device) {
      await this.device.disconnect().catch((error: unknown) => {
        logger.warn('disconnect() on device threw, clearing local state anyway', {
          message: (error as Error)?.message,
        });
      });
      this.device = null;
    }
    this.activeSessionId = null;
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
    const device = this.requireConnectedDevice();
    if (this.state !== 'ready') {
      throw new Error(`Cannot start a drill while device is "${this.state}"`);
    }

    const sessionId = `bt-session-${Date.now()}`;
    this.activeSessionId = sessionId;
    this.setState('busy');

    await device.write(JSON.stringify(buildDrillCommand(spec.name, spec.targets)));
    this.emitTelemetry(sessionId, 'SESSION_STARTED', {});
  }

  async previewDrill(spec: DrillSpec): Promise<void> {
    const device = this.requireConnectedDevice();
    await device.write(JSON.stringify(buildPreviewCommand(spec.name, spec.targets)));
  }

  async stopDrill(): Promise<void> {
    const device = this.requireConnectedDevice();
    await device.write(JSON.stringify(buildStopCommand()));

    if (this.activeSessionId) {
      this.emitTelemetry(this.activeSessionId, 'SESSION_STOPPED', {});
      this.activeSessionId = null;
    }
    this.setState('ready');
  }

  private requireConnectedDevice(): BluetoothDevice {
    if (!this.device) {
      throw new DeviceTransportUnavailableError('Not connected to a device.');
    }
    return this.device;
  }

  private handleRawData(chunk: string) {
    let messages: unknown[];
    try {
      messages = this.framer.push(chunk);
    } catch (error) {
      logger.error('framer threw on incoming data — resetting stream', {
        message: (error as Error)?.message,
      });
      this.framer.reset();
      return;
    }

    for (const raw of messages) {
      const parsed = parsePiMessage(raw);

      switch (parsed.kind) {
        case 'system_info':
          this.systemMetricsListeners.forEach((listener) => listener(normalizeSystemInfo(parsed.data)));
          break;

        case 'drill_result':
          if (this.activeSessionId) {
            const event = normalizeDrillResult(parsed.data, this.activeSessionId);
            this.telemetryListeners.forEach((listener) => listener(event));
          }
          break;

        case 'device_info':
          logger.debug('device_info received', { deviceId: parsed.data.device_id });
          break;

        case 'unknown':
          logger.warn('unrecognized message from device', { raw: parsed.raw });
          break;
      }
    }
  }

  private handleUnexpectedDisconnect() {
    this.teardownSubscriptions();
    this.device = null;
    this.setState('offline');
    if (this.activeSessionId) {
      this.emitTelemetry(this.activeSessionId, 'DEVICE_DISCONNECTED', {});
      this.activeSessionId = null;
    }
  }

  private teardownSubscriptions() {
    this.dataSubscription?.remove();
    this.disconnectSubscription?.remove();
    this.dataSubscription = null;
    this.disconnectSubscription = null;
  }

  private setState(next: DeviceConnectionState) {
    this.state = next;
    this.stateListeners.forEach((listener) => listener(next));
  }

  private emitTelemetry(
    sessionId: string,
    eventType: TelemetryEvent['eventType'],
    partial: Partial<Pick<TelemetryEvent, 'targetId' | 'targetIndex' | 'coordinates' | 'metrics'>>,
  ) {
    const event = createTelemetryEvent({ sessionId, eventType, state: this.state, ...partial });
    this.telemetryListeners.forEach((listener) => listener(event));
  }
}
