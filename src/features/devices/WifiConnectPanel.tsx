import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Button, Card, Text, TextField, useTheme } from '@/design-system';
import { env } from '@/constants/env';
import {
  DEFAULT_HOTSPOT_HOST,
  DEFAULT_SHARED_WIFI_HOST,
  formatWifiAddress,
  parseWifiAddress,
} from '@/services/device-transport/wifiAddress';
import { useDeviceStore } from '@/state/deviceStore';

export type WifiMode = 'shared' | 'hotspot';

const COPY: Record<
  WifiMode,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    steps: string[];
    caution: string;
    defaultHost: string;
    failure: string;
  }
> = {
  shared: {
    icon: 'wifi',
    title: 'Same Wi-Fi network',
    steps: [
      'Make sure the GymBeam unit is set up on the gym’s Wi-Fi.',
      'Join that same Wi-Fi network on this phone.',
      'Tap Connect.',
    ],
    caution:
      'The network has to let devices talk to each other. Guest and some public gym networks block this — if Connect fails, try the GymBeam hotspot instead.',
    defaultHost: DEFAULT_SHARED_WIFI_HOST,
    failure:
      'Couldn’t reach the GymBeam on this network. Check both are on the same Wi-Fi and that the address is right. Some networks block devices from talking to each other.',
  },
  hotspot: {
    icon: 'radio',
    title: 'GymBeam hotspot',
    steps: [
      'Open your phone’s Wi-Fi settings.',
      'Join the network your GymBeam unit broadcasts (its name starts with “GymBeam”).',
      'Come back here and tap Connect.',
    ],
    caution:
      'Your phone won’t have internet while it’s joined to the GymBeam hotspot. Rejoin your usual Wi-Fi when you finish training.',
    defaultHost: DEFAULT_HOTSPOT_HOST,
    failure:
      'Couldn’t reach the GymBeam. Check this phone is joined to the GymBeam hotspot, then try again.',
  },
};

export function WifiConnectPanel({ mode }: { mode: WifiMode }) {
  const theme = useTheme();
  const copy = COPY[mode];
  const connectionState = useDeviceStore((state) => state.connectionState);
  const setWifiDevice = useDeviceStore((state) => state.setWifiDevice);

  const [address, setAddress] = useState(copy.defaultHost);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = async () => {
    const endpoint = parseWifiAddress(address);
    if (!endpoint) {
      setError('Enter the GymBeam’s address, for example gymbeam.local or 192.168.4.1.');
      return;
    }

    setError(null);
    setConnecting(true);
    try {
      if (!env.enableMockDevice) await setWifiDevice(formatWifiAddress(endpoint));
      await useDeviceStore.getState().connect();
    } catch {
      setError(copy.failure);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
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
          <Ionicons name={copy.icon} size={36} color={theme.colors.onAccent} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {copy.title}
        </Text>
      </View>

      <Card style={{ gap: theme.spacing.md }}>
        {copy.steps.map((step, index) => (
          <View key={step} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: theme.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.target,
              }}
            >
              <Text variant="label" style={{ color: theme.colors.onAccent }}>
                {index + 1}
              </Text>
            </View>
            <Text style={{ flex: 1 }}>{step}</Text>
          </View>
        ))}

        {mode === 'hotspot' && Platform.OS === 'android' ? (
          <Button
            label="Open Wi-Fi settings"
            variant="outline"
            onPress={() => Linking.sendIntent('android.settings.WIFI_SETTINGS').catch(() => {})}
            fullWidth
          />
        ) : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
        <Text variant="caption" color="secondary" style={{ flex: 1 }}>
          {copy.caution}
        </Text>
      </View>

      <TextField
        label="GymBeam address"
        value={address}
        onChangeText={setAddress}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={connect}
        errorMessage={error ?? undefined}
      />

      <Button
        label="Connect"
        variant="accent"
        size="lg"
        loading={connecting || connectionState === 'connecting'}
        onPress={connect}
        fullWidth
      />
    </View>
  );
}
