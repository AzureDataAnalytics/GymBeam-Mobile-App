import type { Device, Subscription } from 'react-native-ble-plx';

import type { DeviceConnectionState } from '@/types/domain';
import { createTelemetryEvent, type TelemetryEvent } from '@/types/telemetry';
import { createLogger } from '@/utils/logger';

import { getBleManager } from './bleManager';
import {
  BLE_ATT_HEADER_BYTES,
  BLE_MIN_CHUNK_BYTES,
  BLE_REQUESTED_MTU,
  BleTextDecoder,
  encodeBleChunks,
  GYMBEAM_BLE_RX_CHARACTERISTIC_UUID,
  GYMBEAM_BLE_SERVICE_UUID,
  GYMBEAM_BLE_TX_CHARACTERISTIC_UUID,
} from './bleProtocol';
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

const logger = createLogger('device.ble');

const CONNECT_TIMEOUT_MS = 10000;

/**
 * Talks to the Pi over Bluetooth Low Energy, which works on iPhone as well as
 * Android. Same JSON commands and events as Bluetooth Classic, sent as a byte
 * stream over the UART-style GATT service in bleProtocol.ts.
 *
 * Needs a Pi that runs that GATT service — the firmware's original Bluetooth
 * Classic server is not enough. See docs/device-integration.md.
 *
 * `deviceId` is whatever the scan reported: a MAC address on Android, a
 * per-phone UUID on iOS. It is only meaningful on the phone that scanned it.
 */
export class BleTransport implements DeviceTransport {
  readonly id: string;
  readonly isMock = false;

  private state: DeviceConnectionState = 'offline';
  private stateListeners = new Set<DeviceStateListener>();
  private telemetryListeners = new Set<TelemetryListener>();
  private systemMetricsListeners = new Set<SystemMetricsListener>();
  private framer = new JsonStreamFramer();
  private decoder = new BleTextDecoder();
  private device: Device | null = null;
  private chunkBytes = BLE_MIN_CHUNK_BYTES;
  private dataSubscription: Subscription | null = null;
  private disconnectSubscription: Subscription | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private activeSessionId: string | null = null;

  constructor(private readonly deviceId: string) {
    this.id = `ble-${deviceId}`;
  }

  async connect(): Promise<void> {
    this.teardownSubscriptions();
    this.setState('connecting');

    try {
      const manager = getBleManager();
      const connected = await manager.connectToDevice(this.deviceId, {
        requestMTU: BLE_REQUESTED_MTU,
        timeout: CONNECT_TIMEOUT_MS,
      });
      const device = await connected.discoverAllServicesAndCharacteristics();
      this.device = device;
      this.framer.reset();
      this.decoder.reset();
      this.writeQueue = Promise.resolve();
      this.chunkBytes = Math.max(
        BLE_MIN_CHUNK_BYTES,
        Math.min(device.mtu, BLE_REQUESTED_MTU) - BLE_ATT_HEADER_BYTES,
      );

      this.dataSubscription = device.monitorCharacteristicForService(
        GYMBEAM_BLE_SERVICE_UUID,
        GYMBEAM_BLE_TX_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          // A monitor error means the link dropped; onDisconnected reports that.
          if (error || !characteristic?.value) return;
          this.handleRawData(this.decoder.push(characteristic.value));
        },
      );
      this.disconnectSubscription = manager.onDeviceDisconnected(this.deviceId, () =>
        this.handleUnexpectedDisconnect(),
      );

      this.setState('online');

      // Same handshake as Bluetooth Classic: the Pi replies with device_info
      // once it has received a Time command.
      await this.write(JSON.stringify(buildTimeCommand(new Date())));

      this.setState('ready');
    } catch (error) {
      this.teardownSubscriptions();
      this.device = null;
      await getBleManager()
        .cancelDeviceConnection(this.deviceId)
        .catch(() => {});
      this.setState('error');
      logger.error('connect failed', { message: (error as Error)?.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.teardownSubscriptions();
    this.framer.reset();
    this.decoder.reset();
    if (this.device) {
      await this.device.cancelConnection().catch((error: unknown) => {
        logger.warn('cancelConnection() threw, clearing local state anyway', {
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
    this.requireConnectedDevice();
    if (this.state !== 'ready') {
      throw new Error(`Cannot start a drill while device is "${this.state}"`);
    }

    const sessionId = `ble-session-${Date.now()}`;
    this.activeSessionId = sessionId;
    this.setState('busy');

    try {
      await this.write(JSON.stringify(buildDrillCommand(spec.name, spec.targets)));
    } catch (error) {
      this.activeSessionId = null;
      if (this.device) this.setState('ready');
      throw error;
    }
    this.emitTelemetry(sessionId, 'SESSION_STARTED', {});
  }

  async previewDrill(spec: DrillSpec): Promise<void> {
    await this.write(JSON.stringify(buildPreviewCommand(spec.name, spec.targets)));
  }

  async stopDrill(): Promise<void> {
    await this.write(JSON.stringify(buildStopCommand()));

    if (this.activeSessionId) {
      this.emitTelemetry(this.activeSessionId, 'SESSION_STOPPED', {});
      this.activeSessionId = null;
    }
    this.setState('ready');
  }

  private requireConnectedDevice(): Device {
    if (!this.device) {
      throw new DeviceTransportUnavailableError('Not connected to a device.');
    }
    return this.device;
  }

  private write(message: string): Promise<void> {
    const device = this.requireConnectedDevice();
    const chunks = encodeBleChunks(message, this.chunkBytes);

    const send = async () => {
      for (const chunk of chunks) {
        await device.writeCharacteristicWithResponseForService(
          GYMBEAM_BLE_SERVICE_UUID,
          GYMBEAM_BLE_RX_CHARACTERISTIC_UUID,
          chunk,
        );
      }
    };

    const result = this.writeQueue.then(send);
    // A failed message must not block the ones queued after it.
    this.writeQueue = result.catch(() => {});
    return result;
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
          this.systemMetricsListeners.forEach((listener) =>
            listener(normalizeSystemInfo(parsed.data)),
          );
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
