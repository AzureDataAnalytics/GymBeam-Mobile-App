import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, Button, Card, Screen, Text, useTheme } from '@/design-system';
import { DEVICE_STATUS_LABEL, DEVICE_STATUS_TONE } from '@/features/devices/deviceStatus';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';

export default function HomeScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const connectionState = useDeviceStore((state) => state.connectionState);

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <Text variant="caption" color="secondary">
            Welcome back
          </Text>
          <Text variant="display">{user?.name ?? 'Trainee'}</Text>
        </View>

        <Card elevated style={{ gap: theme.spacing.md }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text variant="subtitle">Device</Text>
            <Badge
              label={DEVICE_STATUS_LABEL[connectionState]}
              tone={DEVICE_STATUS_TONE[connectionState]}
            />
          </View>
          <Button
            label="Manage devices"
            variant="outline"
            onPress={() => router.push('/(tabs)/devices')}
          />
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Start session"
              onPress={() => router.push('/(tabs)/sessions')}
              fullWidth
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Exercises"
              variant="secondary"
              onPress={() => router.push('/(tabs)/exercises')}
              fullWidth
            />
          </View>
        </View>

        <Card style={{ gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="subtitle">AI Coach</Text>
            <Badge label="Coming soon" tone="neutral" />
          </View>
          <Text variant="caption" color="secondary">
            AI-driven insights and recommendations will appear here once the backend AI service is
            available. See docs/api-integration.md for the planned contract.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
