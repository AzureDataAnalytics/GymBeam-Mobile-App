import { create } from 'zustand';

import {
  applyTelemetry,
  type DrillRecording,
  startRecording,
} from '@/features/history/drillRecorder';
import { nextSessionState } from '@/features/sessions/sessionStateMachine';
import {
  createDeviceTransport,
  type DeviceLink,
  type DeviceTransport,
  type DrillSpec,
} from '@/services/device-transport';
import { useHistoryStore } from '@/state/historyStore';
import { deviceStorage } from '@/storage/deviceStorage';
import type { DeviceConnectionState, DeviceSystemMetrics, SessionState } from '@/types/domain';
import type { TelemetryEvent } from '@/types/telemetry';

const MAX_TELEMETRY_LOG = 200;

type DeviceState = {
  transport: DeviceTransport;
  connectionState: DeviceConnectionState;
  sessionState: SessionState;
  telemetryLog: TelemetryEvent[];
  latestMetrics: DeviceSystemMetrics | null;
  pairedMacAddress: string | null;
  wifiAddress: string | null;
  bleDeviceId: string | null;

  hydrate: () => Promise<void>;
  setPairedDevice: (address: string | null) => Promise<void>;
  setWifiDevice: (address: string | null) => Promise<void>;
  setBleDevice: (deviceId: string | null) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendDrill: (spec: DrillSpec) => Promise<void>;
  stopDrill: () => Promise<void>;
  clearTelemetry: () => void;
};

type SetState = (
  partial: Partial<DeviceState> | ((state: DeviceState) => Partial<DeviceState>),
) => void;

/** The drill just sent, until the transport confirms it with SESSION_STARTED. */
let pendingDrill: { spec: DrillSpec; isMock: boolean } | null = null;
let recording: DrillRecording | null = null;

/** Builds a history entry out of a drill's telemetry and saves it when the drill ends. */
function recordForHistory(event: TelemetryEvent) {
  if (event.eventType === 'SESSION_STARTED' && pendingDrill) {
    recording = startRecording({ ...pendingDrill.spec, isMock: pendingDrill.isMock }, event);
    pendingDrill = null;
    return;
  }
  if (!recording) return;

  const step = applyTelemetry(recording, event);
  recording = step.recording;
  if (step.finished) {
    void useHistoryStore.getState().add(step.finished);
  }
}

function attachTransportListeners(transport: DeviceTransport, set: SetState): () => void {
  const unsubState = transport.onStateChange((connectionState) => set({ connectionState }));
  const unsubTelemetry = transport.onTelemetry((event) => {
    recordForHistory(event);
    set((state) => ({
      telemetryLog: [event, ...state.telemetryLog].slice(0, MAX_TELEMETRY_LOG),
      sessionState: nextSessionState(state.sessionState, event.eventType),
    }));
  });
  const unsubMetrics = transport.onSystemMetrics((latestMetrics) => set({ latestMetrics }));

  return () => {
    unsubState();
    unsubTelemetry();
    unsubMetrics();
  };
}

let detachCurrentTransportListeners: (() => void) | null = null;

export const useDeviceStore = create<DeviceState>((set, get) => {
  const initialTransport = createDeviceTransport();
  detachCurrentTransportListeners = attachTransportListeners(initialTransport, set);

  const switchLink = async (link: Required<DeviceLink>) => {
    await get()
      .transport.disconnect()
      .catch(() => {});
    detachCurrentTransportListeners?.();
    pendingDrill = null;
    recording = null;

    await Promise.all([
      deviceStorage.setPairedMacAddress(link.macAddress),
      deviceStorage.setWifiAddress(link.wifiAddress),
      deviceStorage.setBleDeviceId(link.bleDeviceId),
    ]);

    const nextTransport = createDeviceTransport(link);
    detachCurrentTransportListeners = attachTransportListeners(nextTransport, set);

    set({
      transport: nextTransport,
      pairedMacAddress: link.macAddress,
      wifiAddress: link.wifiAddress,
      bleDeviceId: link.bleDeviceId,
      connectionState: nextTransport.getConnectionState(),
      sessionState: 'idle',
      telemetryLog: [],
      latestMetrics: null,
    });
  };

  return {
    transport: initialTransport,
    connectionState: initialTransport.getConnectionState(),
    sessionState: 'idle',
    telemetryLog: [],
    latestMetrics: null,
    pairedMacAddress: null,
    wifiAddress: null,
    bleDeviceId: null,

    hydrate: async () => {
      const [wifi, ble, mac] = await Promise.all([
        deviceStorage.getWifiAddress(),
        deviceStorage.getBleDeviceId(),
        deviceStorage.getPairedMacAddress(),
      ]);
      if (wifi) {
        await get().setWifiDevice(wifi);
      } else if (ble) {
        await get().setBleDevice(ble);
      } else if (mac) {
        await get().setPairedDevice(mac);
      }
    },

    setPairedDevice: (address) =>
      switchLink({ macAddress: address, wifiAddress: null, bleDeviceId: null }),
    setWifiDevice: (address) =>
      switchLink({ macAddress: null, wifiAddress: address, bleDeviceId: null }),
    setBleDevice: (deviceId) =>
      switchLink({ macAddress: null, wifiAddress: null, bleDeviceId: deviceId }),

    connect: () => get().transport.connect(),
    disconnect: () => get().transport.disconnect(),
    sendDrill: async (spec) => {
      const { transport } = get();
      pendingDrill = { spec, isMock: transport.isMock };
      try {
        await transport.sendDrill(spec);
      } catch (error) {
        pendingDrill = null;
        throw error;
      }
    },
    stopDrill: () => get().transport.stopDrill(),
    clearTelemetry: () => set({ telemetryLog: [] }),
  };
});
