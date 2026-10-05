import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, Text, useTheme } from '@/design-system';
import { DEVICE_STATUS_LABEL } from '@/features/devices/deviceStatus';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';

type IconName = keyof typeof Ionicons.glyphMap;

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const connectionState = useDeviceStore((state) => state.connectionState);
  const name = user?.name ?? 'Unknown user';

  const onSignOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <View style={{ gap: theme.spacing.lg }}>
        <Text
          variant="display"
          accessibilityRole="header"
          style={{ paddingHorizontal: theme.spacing.xs }}
        >
          Profile
        </Text>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: theme.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.textPrimary,
            }}
          >
            <Text variant="title" color="inverse">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <Text variant="subtitle" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" color="secondary">
              {user?.roles.join(', ') || 'Member'}
            </Text>
          </View>
        </Card>

        <Card padded={false}>
          <ProfileRow
            icon="hardware-chip-outline"
            label="Devices"
            value={DEVICE_STATUS_LABEL[connectionState]}
            href="/(tabs)/devices"
          />
          <ProfileRow icon="list-outline" label="Sessions" href="/(tabs)/sessions" divider />
          <ProfileRow icon="disc-outline" label="Exercises" href="/(tabs)/exercises" divider />
        </Card>

        <Button
          label="Sign out"
          variant="dangerOutline"
          icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />}
          onPress={onSignOut}
          fullWidth
        />
      </View>
    </Screen>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  href,
  divider = false,
}: {
  icon: IconName;
  label: string;
  value?: string;
  href: Href;
  divider?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: 48,
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.md,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: theme.colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={theme.colors.textSecondary} />
      <Text style={{ flex: 1 }}>{label}</Text>
      {value ? (
        <Text variant="caption" color="secondary">
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
    </Pressable>
  );
}
