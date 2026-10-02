import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, View } from 'react-native';

import { Badge, Button, Card, EmptyState, LoadingState, Screen, Text, useTheme } from '@/design-system';
import {
  type BondedDeviceSummary,
  isBluetoothEnabled,
  listBondedDevices,
} from '@/services/device-transport/nativeBluetooth';
import { requestAndroidBluetoothPermissions } from '@/services/device-transport/androidBluetoothPermissions';
import { useDeviceStore } from '@/state/deviceStore';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error' | 'bluetooth-off' | 'permission-denied';

/**
 * Lists devices already paired at the OS level and lets the user pick which
 * one is their GymBeam unit. Pairing itself (the OS-level Bluetooth
 * handshake) happens in Android's own Bluetooth settings first — same
 * prerequisite the legacy Flutter app had. See docs/device-integration.md.
 */
export default function PairDeviceScreen() {
  const theme = useTheme();
  const pairedMacAddress = useDeviceStore((state) => state.pairedMacAddress);
  const setPairedDevice = useDeviceStore((state) => state.setPairedDevice);

  const [status, setStatus] = useState<LoadStatus>('idle');
  const [devices, setDevices] = useState<BondedDeviceSummary[]>([]);

  const load = useCallback(async () => {
    setStatus('loading');

    const granted = await requestAndroidBluetoothPermissions();
    if (!granted) {
      setStatus('permission-denied');
      return;
    }

    const enabled = await isBluetoothEnabled();
    if (!enabled) {
      setStatus('bluetooth-off');
      return;
    }

    try {
      const bonded = await listBondedDevices();
      setDevices(bonded);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Deferred so the effect body itself never synchronously calls setState
    // (load() sets `status` as its first statement) — see
    // react-hooks/set-state-in-effect.
    if (Platform.OS === 'android') queueMicrotask(load);
  }, [load]);

  if (Platform.OS !== 'android') {
    return (
      <Screen>
        <EmptyState
          title="Not available on this device"
          description="Real device pairing over Bluetooth Classic is Android-only today — see docs/device-integration.md for why iOS can't do this yet."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <Text variant="title">Pair a device</Text>
        <Text variant="caption" color="secondary">
          Pair your GymBeam unit in Android&rsquo;s Bluetooth settings first, then select it below.
        </Text>

        {status === 'loading' ? <LoadingState label="Looking for paired devices…" /> : null}

        {status === 'permission-denied' ? (
          <EmptyState
            title="Bluetooth permission needed"
            description="Grant Bluetooth permission in your phone's app settings, then try again."
            actionLabel="Try again"
            onAction={load}
          />
        ) : null}

        {status === 'bluetooth-off' ? (
          <EmptyState
            title="Bluetooth is off"
            description="Turn on Bluetooth on this phone, then try again."
            actionLabel="Try again"
            onAction={load}
          />
        ) : null}

        {status === 'error' ? (
          <EmptyState
            title="Couldn't load paired devices"
            description="Something went wrong talking to this phone's Bluetooth adapter."
            actionLabel="Try again"
            onAction={load}
          />
        ) : null}

        {status === 'ready' && devices.length === 0 ? (
          <EmptyState
            title="No paired devices found"
            description="Open your phone's Bluetooth settings, pair with your GymBeam unit, then come back and try again."
            actionLabel="Try again"
            onAction={load}
          />
        ) : null}

        {status === 'ready' && devices.length > 0 ? (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.address}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
            renderItem={({ item }) => {
              const isPaired = item.address === pairedMacAddress;
              return (
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ gap: theme.spacing.xxs }}>
                    <Text variant="bodyStrong">{item.name || 'Unnamed device'}</Text>
                    <Text variant="caption" color="secondary">
                      {item.address}
                    </Text>
                  </View>
                  {isPaired ? (
                    <Badge label="Selected" tone="success" />
                  ) : (
                    <Button
                      label="Use this device"
                      size="sm"
                      variant="outline"
                      onPress={async () => {
                        await setPairedDevice(item.address);
                        router.back();
                      }}
                    />
                  )}
                </Card>
              );
            }}
          />
        ) : null}

        {pairedMacAddress ? (
          <Button
            label="Forget paired device"
            variant="ghost"
            onPress={async () => {
              await setPairedDevice(null);
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}
