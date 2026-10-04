import { create } from 'zustand';

import { nextSessionState } from '@/features/sessions/sessionStateMachine';
import {
  createDeviceTransport,
  type DeviceLink,
  type DeviceTransport,
  type DrillSpec,
} from '@/services/device-transport';
import { deviceStorage } from '@/storage/deviceStorage';
import type { DeviceConnectionState, DeviceSystemMetrics, SessionState } from '@/types/domain';
import type { TelemetryEvent } from '@/types/telemetry';

const MAX_TELEMETRY_LOG = 200;

interface DeviceState {
  transport: DeviceTransport;
  connectionState: DeviceConnectionState;
  sessionState: SessionState;
  telemetryLog: TelemetryEvent[];
  latestMetrics: DeviceSystemMetrics | null;
  pairedMacAddress: string | null;
  wifiAddress: string | null;

  hydrate: () => Promise<void>;
  setPairedDevice: (address: string | null) => Promise<void>;
  setWifiDevice: (address: string | null) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendDrill: (spec: DrillSpec) => Promise<void>;
  stopDrill: () => Promise<void>;
  clearTelemetry: () => void;
}

type SetState = (
  partial: Partial<DeviceState> | ((state: DeviceState) => Partial<DeviceState>),
) => void;

function attachTransportListeners(transport: DeviceTransport, set: SetState): () => void {
  const unsubState = transport.onStateChange((connectionState) => set({ connectionState }));
  const unsubTelemetry = transport.onTelemetry((event) =>
    set((state) => ({
      telemetryLog: [event, ...state.telemetryLog].slice(0, MAX_TELEMETRY_LOG),
      sessionState: nextSessionState(state.sessionState, event.eventType),
    })),
  );
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

    await Promise.all([
      deviceStorage.setPairedMacAddress(link.macAddress),
      deviceStorage.setWifiAddress(link.wifiAddress),
    ]);

    const nextTransport = createDeviceTransport(link);
    detachCurrentTransportListeners = attachTransportListeners(nextTransport, set);

    set({
      transport: nextTransport,
      pairedMacAddress: link.macAddress,
      wifiAddress: link.wifiAddress,
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

    hydrate: async () => {
      const [wifi, mac] = await Promise.all([
        deviceStorage.getWifiAddress(),
        deviceStorage.getPairedMacAddress(),
      ]);
      if (wifi) {
        await get().setWifiDevice(wifi);
      } else if (mac) {
        await get().setPairedDevice(mac);
      }
    },

    setPairedDevice: (address) => switchLink({ macAddress: address, wifiAddress: null }),
    setWifiDevice: (address) => switchLink({ macAddress: null, wifiAddress: address }),

    connect: () => get().transport.connect(),
    disconnect: () => get().transport.disconnect(),
    sendDrill: (spec) => get().transport.sendDrill(spec),
    stopDrill: () => get().transport.stopDrill(),
    clearTelemetry: () => set({ telemetryLog: [] }),
  };
});
