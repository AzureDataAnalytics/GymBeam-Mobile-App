import type { DeviceConnectionState } from '@/types/domain';
import { createTelemetryEvent, type TelemetryEvent } from '@/types/telemetry';
import { createLogger } from '@/utils/logger';

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
import { parseWifiAddress, toWebSocketUrl } from './wifiAddress';

const logger = createLogger('device.wifi');

const CONNECT_TIMEOUT_MS = 6000;

/**
 * Talks to the Pi over a WebSocket on the local network (shared Wi-Fi or the
 * Pi's own hotspot). Same JSON commands and events as Bluetooth Classic, one
 * JSON object per text frame. The Pi-side server this expects is specified in
 * docs/device-integration.md.
 */
export class WifiTransport implements DeviceTransport {
  readonly id: string;
  readonly isMock = false;

  private state: DeviceConnectionState = 'offline';
  private stateListeners = new Set<DeviceStateListener>();
  private telemetryListeners = new Set<TelemetryListener>();
  private systemMetricsListeners = new Set<SystemMetricsListener>();
  private socket: WebSocket | null = null;
  private activeSessionId: string | null = null;

  constructor(private readonly address: string) {
    this.id = `wifi-${address}`;
  }

  async connect(): Promise<void> {
    const endpoint = parseWifiAddress(this.address);
    if (!endpoint) {
      this.setState('error');
      throw new DeviceTransportUnavailableError(`"${this.address}" is not a valid address.`);
    }

    this.closeSocket();
    this.setState('connecting');

    try {
      const socket = await openSocket(toWebSocketUrl(endpoint));
      this.socket = socket;
      socket.onmessage = (event) => this.handleMessage(event.data);
      socket.onclose = () => this.handleUnexpectedClose(socket);

      this.setState('online');
      socket.send(JSON.stringify(buildTimeCommand(new Date())));
      this.setState('ready');
    } catch (error) {
      this.setState('error');
      logger.error('connect failed', { message: (error as Error)?.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.closeSocket();
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
    const socket = this.requireSocket();
    if (this.state !== 'ready') {
      throw new Error(`Cannot start a drill while device is "${this.state}"`);
    }

    const sessionId = `wifi-session-${Date.now()}`;
    this.activeSessionId = sessionId;
    this.setState('busy');

    socket.send(JSON.stringify(buildDrillCommand(spec.name, spec.targets)));
    this.emitTelemetry(sessionId, 'SESSION_STARTED');
  }

  async previewDrill(spec: DrillSpec): Promise<void> {
    this.requireSocket().send(JSON.stringify(buildPreviewCommand(spec.name, spec.targets)));
  }

  async stopDrill(): Promise<void> {
    this.requireSocket().send(JSON.stringify(buildStopCommand()));

    if (this.activeSessionId) {
      this.emitTelemetry(this.activeSessionId, 'SESSION_STOPPED');
      this.activeSessionId = null;
    }
    this.setState('ready');
  }

  private requireSocket(): WebSocket {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new DeviceTransportUnavailableError('Not connected to a device.');
    }
    return this.socket;
  }

  private handleMessage(data: unknown) {
    if (typeof data !== 'string') return;

    let raw: unknown;
    try {
      raw = JSON.parse(data);
    } catch {
      logger.warn('non-JSON message from device');
      return;
    }

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

  private handleUnexpectedClose(socket: WebSocket) {
    if (this.socket !== socket) return;
    this.socket = null;
    this.setState('offline');
    if (this.activeSessionId) {
      this.emitTelemetry(this.activeSessionId, 'DEVICE_DISCONNECTED');
      this.activeSessionId = null;
    }
  }

  private closeSocket() {
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onmessage = null;
      socket.onclose = null;
      socket.close();
    }
  }

  private setState(next: DeviceConnectionState) {
    this.state = next;
    this.stateListeners.forEach((listener) => listener(next));
  }

  private emitTelemetry(sessionId: string, eventType: TelemetryEvent['eventType']) {
    const event = createTelemetryEvent({ sessionId, eventType, state: this.state });
    this.telemetryListeners.forEach((listener) => listener(event));
  }
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);

    const fail = (reason: string) => {
      clearTimeout(timer);
      socket.onopen = null;
      socket.onerror = null;
      socket.close();
      reject(new DeviceTransportUnavailableError(reason));
    };
    const timer = setTimeout(() => fail(`Timed out connecting to ${url}.`), CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      clearTimeout(timer);
      socket.onerror = null;
      resolve(socket);
    };
    socket.onerror = () => fail(`Couldn't reach ${url}.`);
  });
}
