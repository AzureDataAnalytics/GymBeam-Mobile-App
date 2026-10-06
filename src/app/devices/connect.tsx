import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Badge, Button, Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system';
import { env } from '@/constants/env';
import { BluetoothConnectPanel } from '@/features/devices/BluetoothConnectPanel';
import { WifiConnectPanel } from '@/features/devices/WifiConnectPanel';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';

type ConnectMethod = 'bluetooth' | 'shared' | 'hotspot';

const METHODS: { id: ConnectMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth' },
  { id: 'shared', label: 'Wi-Fi', icon: 'wifi' },
  { id: 'hotspot', label: 'Hotspot', icon: 'radio' },
];

export default function ConnectDeviceScreen() {
  const theme = useTheme();
  const connectionState = useDeviceStore((state) => state.connectionState);
  const disconnect = useDeviceStore((state) => state.disconnect);
  const isSignedIn = useAuthStore((state) => state.status === 'authenticated');
  const { from } = useLocalSearchParams<{ from?: string }>();
  // Bluetooth can't reach a real unit on iPhone, so start iPhones on Wi-Fi.
  const [method, setMethod] = useState<ConnectMethod>(
    Platform.OS === 'ios' ? 'shared' : 'bluetooth',
  );

  const startDrill = () => {
    if (from === 'drill' && router.canGoBack()) {
      router.back();
    } else {
      router.replace(isSignedIn ? '/(tabs)/drill' : '/exercises/create');
    }
  };

  const isConnected =
    connectionState === 'online' || connectionState === 'ready' || connectionState === 'busy';

  return (
    <Screen scroll padded={false}>
      <ScreenHeader
        title="Connect GymBeam"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        trailing={env.enableMockDevice ? <Badge label="Simulated" tone="warning" /> : null}
      />

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        {isConnected ? (
          <Card style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <Ionicons name="checkmark-circle" size={56} color={theme.colors.success} />
            <Text variant="title">Connected</Text>
            <Text color="secondary" style={{ textAlign: 'center' }}>
              Your GymBeam is ready. You can start a drill now.
            </Text>
            <Button
              label="Start a Drill"
              variant="accent"
              size="lg"
              onPress={startDrill}
              fullWidth
            />
            <Button label="Disconnect" variant="ghost" onPress={disconnect} />
          </Card>
        ) : (
          <>
            <View
              accessibilityRole="tablist"
              style={{
                flexDirection: 'row',
                padding: theme.spacing.xs,
                gap: theme.spacing.xs,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              {METHODS.map(({ id, label, icon }) => {
                const selected = id === method;
                const color = selected ? theme.colors.onAccent : theme.colors.textSecondary;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => setMethod(id)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: theme.spacing.xs,
                      minHeight: 44,
                      borderRadius: theme.radius.sm + 2,
                      backgroundColor: selected ? theme.colors.accent : 'transparent',
                    }}
                  >
                    <Ionicons name={icon} size={18} color={color} />
                    <Text variant="caption" style={{ color, fontWeight: '600' }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {method === 'bluetooth' ? (
              <BluetoothConnectPanel />
            ) : (
              <WifiConnectPanel key={method} mode={method} />
            )}

            {env.enableMockDevice && method !== 'bluetooth' ? (
              <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                The mock device is turned on, so Connect uses a simulated GymBeam instead of the
                address above.
              </Text>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
