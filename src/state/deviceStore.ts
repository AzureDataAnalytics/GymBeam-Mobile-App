import { create } from 'zustand';

import { nextSessionState } from '@/features/sessions/sessionStateMachine';
import {
  createDeviceTransport,
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

  hydrate: () => Promise<void>;
  /** Pass null to un-pair and fall back to the mock device. */
  setPairedDevice: (address: string | null) => Promise<void>;
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

  return {
    transport: initialTransport,
    connectionState: initialTransport.getConnectionState(),
    sessionState: 'idle',
    telemetryLog: [],
    latestMetrics: null,
    pairedMacAddress: null,

    hydrate: async () => {
      const stored = await deviceStorage.getPairedMacAddress();
      if (stored) {
        await get().setPairedDevice(stored);
      }
    },

    setPairedDevice: async (address) => {
      const previous = get().transport;
      await previous.disconnect().catch(() => {});
      detachCurrentTransportListeners?.();

      await deviceStorage.setPairedMacAddress(address);

      const nextTransport = createDeviceTransport(address ?? undefined);
      detachCurrentTransportListeners = attachTransportListeners(nextTransport, set);

      set({
        transport: nextTransport,
        pairedMacAddress: address,
        connectionState: nextTransport.getConnectionState(),
        sessionState: 'idle',
        telemetryLog: [],
        latestMetrics: null,
      });
    },

    connect: () => get().transport.connect(),
    disconnect: () => get().transport.disconnect(),
    sendDrill: (spec) => get().transport.sendDrill(spec),
    stopDrill: () => get().transport.stopDrill(),
    clearTelemetry: () => set({ telemetryLog: [] }),
  };
});
