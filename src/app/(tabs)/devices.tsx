import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { Badge, Button, Card, Screen, Text, useTheme } from '@/design-system';
import { DEVICE_STATUS_LABEL, DEVICE_STATUS_TONE } from '@/features/devices/deviceStatus';
import { useDeviceStore } from '@/state/deviceStore';

export default function DevicesScreen() {
  const theme = useTheme();
  const connectionState = useDeviceStore((state) => state.connectionState);
  const connect = useDeviceStore((state) => state.connect);
  const disconnect = useDeviceStore((state) => state.disconnect);
  const isMock = useDeviceStore((state) => state.transport.isMock);
  const pairedMacAddress = useDeviceStore((state) => state.pairedMacAddress);
  const wifiAddress = useDeviceStore((state) => state.wifiAddress);
  const hasDevice = Boolean(pairedMacAddress || wifiAddress);
  const latestMetrics = useDeviceStore((state) => state.latestMetrics);

  const isBusy = connectionState === 'connecting';
  const isConnected =
    connectionState === 'online' || connectionState === 'ready' || connectionState === 'busy';

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <Text variant="title">Devices</Text>

        {isMock ? (
          <Badge label="Development mock device — not a real GymBeam unit" tone="warning" />
        ) : null}

        <Card elevated style={{ gap: theme.spacing.md }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ gap: theme.spacing.xxs }}>
              <Text variant="subtitle">GymBeam Trainer</Text>
              <Text variant="caption" color="secondary">
                {isMock
                  ? 'Simulated device'
                  : wifiAddress
                    ? `Wi-Fi · ${wifiAddress}`
                    : (pairedMacAddress ?? 'No device paired')}
              </Text>
            </View>
            <Badge
              label={DEVICE_STATUS_LABEL[connectionState]}
              tone={DEVICE_STATUS_TONE[connectionState]}
            />
          </View>

          {connectionState === 'unsupported' ? (
            <Text variant="caption" color="secondary">
              Real device control isn&rsquo;t available on this platform yet. See the project docs
              for why.
            </Text>
          ) : (
            <Button
              label={isConnected ? 'Disconnect' : 'Connect'}
              variant={isConnected ? 'outline' : 'primary'}
              loading={isBusy}
              disabled={!isMock && !hasDevice}
              onPress={isConnected ? disconnect : connect}
              fullWidth
            />
          )}

          {!isMock && !hasDevice ? (
            <Text variant="caption" color="warning">
              Choose a device before connecting.
            </Text>
          ) : null}
        </Card>

        {latestMetrics ? (
          <Card style={{ gap: theme.spacing.sm }}>
            <Text variant="subtitle">Device health</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color="secondary">
                CPU
              </Text>
              <Text variant="caption">{latestMetrics.cpuUsagePercent.toFixed(0)}%</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color="secondary">
                Memory
              </Text>
              <Text variant="caption">{latestMetrics.memoryUsagePercent.toFixed(0)}%</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color="secondary">
                Temperature
              </Text>
              <Text variant="caption">{latestMetrics.temperatureCelsius.toFixed(1)}°C</Text>
            </View>
          </Card>
        ) : null}

        {isConnected ? null : (
          <Button
            label="Find my GymBeam"
            variant="accent"
            onPress={() => router.push('/devices/connect')}
            fullWidth
          />
        )}

        {Platform.OS === 'android' && !isMock ? (
          <Button
            label={pairedMacAddress ? 'Change paired device' : 'Pair a device'}
            variant="secondary"
            onPress={() => router.push('/devices/pair')}
            fullWidth
          />
        ) : null}

        <Text variant="caption" color="secondary">
          {isMock
            ? 'Set EXPO_PUBLIC_ENABLE_MOCK_DEVICE=false in a development build on Android to pair a real GymBeam unit — see docs/device-integration.md.'
            : 'Bluetooth Classic is Android-only — see docs/device-integration.md for why iOS uses a simulated device.'}
        </Text>
      </View>
    </Screen>
  );
}
