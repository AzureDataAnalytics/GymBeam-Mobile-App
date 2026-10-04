import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, Text, useTheme } from '@/design-system';
import { type BeaconScanStatus, useBeaconScan } from '@/features/devices/useBeaconScan';
import { proximityFor } from '@/services/device-discovery/beaconParsing';
import type { DiscoveredBeacon } from '@/services/device-discovery/beaconScanner';
import { ensureBonded } from '@/services/device-transport/nativeBluetooth';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';

const PROXIMITY_LABEL = {
  immediate: 'Right next to you',
  near: 'Nearby',
  far: 'Far away',
  unknown: 'In range',
} as const;

const SCAN_PROBLEMS: Partial<Record<BeaconScanStatus, { title: string; description: string }>> = {
  'permission-denied': {
    title: 'Bluetooth permission needed',
    description:
      'Allow Nearby devices and Location for GymBeam in your phone’s app settings, then try again.',
  },
  unauthorized: {
    title: 'Bluetooth permission needed',
    description:
      'Allow Nearby devices and Location for GymBeam in your phone’s app settings, then try again.',
  },
  'bluetooth-off': {
    title: 'Bluetooth is off',
    description: 'Turn on Bluetooth on this phone, then try again.',
  },
  'location-off': {
    title: 'Location is off',
    description:
      'Android needs Location turned on to find Bluetooth beacons. Turn it on, then try again.',
  },
  unsupported: {
    title: 'Not supported on this phone',
    description: 'This phone can’t scan for Bluetooth Low Energy beacons.',
  },
  unknown: {
    title: 'Couldn’t scan for devices',
    description: 'Something went wrong while scanning. Try again.',
  },
};

export default function ConnectDeviceScreen() {
  const theme = useTheme();
  const { status, beacons, start, stop, isMock } = useBeaconScan();
  const connectionState = useDeviceStore((state) => state.connectionState);
  const setPairedDevice = useDeviceStore((state) => state.setPairedDevice);
  const disconnect = useDeviceStore((state) => state.disconnect);
  const isSignedIn = useAuthStore((state) => state.status === 'authenticated');

  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const isConnected =
    connectionState === 'online' || connectionState === 'ready' || connectionState === 'busy';
  const isScanning = status === 'scanning' || status === 'starting';
  const problem = SCAN_PROBLEMS[status];

  const connectTo = async (beacon: DiscoveredBeacon) => {
    setConnectError(null);
    setConnectingAddress(beacon.address);
    stop();
    try {
      if (!isMock) {
        await ensureBonded(beacon.address);
        await setPairedDevice(beacon.address);
      }
      // Read from the store here: setPairedDevice() has just swapped the transport.
      await useDeviceStore.getState().connect();
    } catch {
      setConnectError(
        `Couldn’t connect to ${beacon.name ?? 'that device'}. Make sure it’s powered on and close by, then try again.`,
      );
      start();
    } finally {
      setConnectingAddress(null);
    }
  };

  return (
    <Screen scroll padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.lg,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="subtitle" accessibilityRole="header" style={{ flex: 1 }}>
          Connect GymBeam
        </Text>
        {isMock ? <Badge label="Simulated" tone="warning" /> : null}
      </View>

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.xl }}>
        {isConnected ? (
          <Card elevated style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
            <Text variant="title">Connected</Text>
            <Text color="secondary" style={{ textAlign: 'center' }}>
              Your GymBeam is ready. You can start a drill now.
            </Text>
            <Button
              label="Start a Drill"
              variant="accent"
              size="lg"
              onPress={() => router.replace(isSignedIn ? '/(tabs)/drill' : '/exercises/create')}
              fullWidth
            />
            <Button
              label="Disconnect"
              variant="ghost"
              onPress={async () => {
                await disconnect();
                start();
              }}
            />
          </Card>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <ScanPulse active={isScanning} />
              <Text variant="title" style={{ textAlign: 'center' }}>
                {isScanning
                  ? beacons.length > 0
                    ? 'Select your GymBeam'
                    : 'Looking for your GymBeam…'
                  : 'Scan paused'}
              </Text>
              <Text color="secondary" style={{ textAlign: 'center' }}>
                Power on the GymBeam unit and keep your phone within a few metres of it.
              </Text>
            </View>

            {problem ? (
              <EmptyState
                title={problem.title}
                description={problem.description}
                actionLabel="Try again"
                onAction={start}
              />
            ) : null}

            {connectError ? (
              <Text color="danger" variant="caption" style={{ textAlign: 'center' }}>
                {connectError}
              </Text>
            ) : null}

            <View style={{ gap: theme.spacing.md }}>
              {beacons.map((beacon) => (
                <BeaconCard
                  key={beacon.address}
                  beacon={beacon}
                  connecting={
                    connectingAddress === beacon.address || connectionState === 'connecting'
                  }
                  disabled={connectingAddress !== null}
                  onConnect={() => connectTo(beacon)}
                />
              ))}
            </View>

            {!problem && !isScanning && connectingAddress === null ? (
              <Button label="Scan again" variant="outline" onPress={start} fullWidth />
            ) : null}

            {Platform.OS === 'android' && !isMock ? (
              <Button
                label="Pick from paired devices instead"
                variant="ghost"
                onPress={() => router.push('/devices/pair')}
              />
            ) : null}
          </>
        )}

        {isMock ? (
          <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
            This is a simulated GymBeam, not a real unit. Real beacon scanning needs an Android
            development build with the mock device turned off.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function BeaconCard({
  beacon,
  connecting,
  disabled,
  onConnect,
}: {
  beacon: DiscoveredBeacon;
  connecting: boolean;
  disabled: boolean;
  onConnect: () => void;
}) {
  const theme = useTheme();
  const proximity = PROXIMITY_LABEL[proximityFor(beacon.distanceMeters)];
  const distance =
    beacon.distanceMeters === null ? '' : ` · about ${formatDistance(beacon.distanceMeters)}`;

  return (
    <Card style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <MaterialCommunityIcons
          name={signalIcon(beacon.rssi)}
          size={28}
          color={theme.colors.target}
          accessibilityLabel={`Signal ${beacon.rssi} dBm`}
        />
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {beacon.name ?? (beacon.isGymBeam ? 'GymBeam unit' : 'Unnamed beacon')}
          </Text>
          <Text variant="caption" color="secondary">
            {proximity}
            {distance}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {beacon.address}
          </Text>
        </View>
        {beacon.isGymBeam ? <Badge label="GymBeam" tone="success" /> : null}
      </View>
      <Button
        label="Connect"
        variant="accent"
        loading={connecting}
        disabled={disabled}
        onPress={onConnect}
        fullWidth
      />
    </Card>
  );
}

function formatDistance(meters: number): string {
  return meters < 10 ? `${meters.toFixed(1)} m` : `${Math.round(meters)} m`;
}

function signalIcon(rssi: number): keyof typeof MaterialCommunityIcons.glyphMap {
  if (rssi >= -60) return 'signal-cellular-3';
  if (rssi >= -75) return 'signal-cellular-2';
  if (rssi >= -90) return 'signal-cellular-1';
  return 'signal-cellular-outline';
}

function ScanPulse({ active }: { active: boolean }) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.target,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
          ],
        }}
      />
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.target,
        }}
      >
        <Ionicons name="bluetooth" size={36} color={theme.colors.onAccent} />
      </View>
    </View>
  );
}
