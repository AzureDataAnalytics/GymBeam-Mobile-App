import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Screen, Text, minTouchTarget, useTheme } from '@/design-system';
import { DEVICE_STATUS_LABEL, DEVICE_STATUS_TONE } from '@/features/devices/deviceStatus';
import { SAMPLE_SUMMARY } from '@/features/runs/sampleRunSession';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';

export default function HomeScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const connectionState = useDeviceStore((state) => state.connectionState);
  const isConnected =
    connectionState === 'online' || connectionState === 'ready' || connectionState === 'busy';

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xxs, paddingHorizontal: theme.spacing.xs }}>
          <Text variant="caption" color="secondary">
            Welcome back
          </Text>
          <Text variant="display" accessibilityRole="header">
            {user?.name ?? 'Trainee'}
          </Text>
        </View>

        <Card style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.skeleton,
              }}
            >
              <MaterialCommunityIcons
                name="access-point"
                size={22}
                color={theme.colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <Text variant="bodyStrong">GymBeam Trainer</Text>
              <Text variant="caption" color="secondary">
                {isConnected ? 'Device connected' : 'No device connected'}
              </Text>
            </View>
            <Badge
              label={DEVICE_STATUS_LABEL[connectionState]}
              tone={DEVICE_STATUS_TONE[connectionState]}
            />
          </View>
          <Button
            label="Manage devices"
            variant="outline"
            onPress={() => router.push('/(tabs)/devices')}
            fullWidth
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

        <Card padded={false}>
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="bodyStrong">Last session</Text>
              <Badge label="Sample data" />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <SessionStat label="Runs" value={`${SAMPLE_SUMMARY.runs}`} />
              <SessionStat label="Distance" value={`${SAMPLE_SUMMARY.distanceKm} km`} />
              <SessionStat label="Reflex score" value={`${SAMPLE_SUMMARY.reflexScore}`} />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/runs/multi-point')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: minTouchTarget,
              paddingHorizontal: theme.spacing.lg,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text variant="caption" color="tint" style={{ fontWeight: '600' }}>
              View results
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.tint} />
          </Pressable>
        </Card>

        <Card style={{ gap: theme.spacing.xs }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text variant="bodyStrong">AI Coach</Text>
            <Badge label="Coming soon" tone="neutral" />
          </View>
          <Text variant="caption" color="secondary">
            AI-driven insights and recommendations will appear here.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

function SessionStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, gap: theme.spacing.xxs }}>
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="subtitle" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
