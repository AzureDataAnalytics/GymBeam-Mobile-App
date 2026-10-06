import { Ionicons } from '@expo/vector-icons';
import { type Href, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, Text, TextField, useTheme } from '@/design-system';
import { DEVICE_STATUS_LABEL } from '@/features/devices/deviceStatus';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';

type IconName = keyof typeof Ionicons.glyphMap;

const DOUBLE_TAP_MS = 300;

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateName = useAuthStore((state) => state.updateName);
  const connectionState = useDeviceStore((state) => state.connectionState);
  const name = user?.name ?? 'Unknown user';
  const [draftName, setDraftName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const lastTapAt = useRef(0);

  const startEditingName = () => {
    if (user && draftName === null) setDraftName(user.name);
  };

  const onHeaderPress = () => {
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      startEditingName();
    } else {
      lastTapAt.current = now;
    }
  };

  const stopEditingName = () => {
    setDraftName(null);
    setNameError(null);
  };

  const saveName = async () => {
    const next = (draftName ?? '').trim();
    if (next.length < 2) {
      setNameError('Enter your full name');
      return;
    }
    setIsSavingName(true);
    try {
      await updateName(next);
      stopEditingName();
    } catch {
      setNameError('We couldn’t save your name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

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

        <Card style={{ gap: theme.spacing.lg }}>
          <Pressable
            disabled={!user || draftName !== null}
            onPress={onHeaderPress}
            accessibilityHint="Edits your name"
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={startEditingName}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}
          >
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
              <Text variant="subtitle">{name}</Text>
              {user?.email ? (
                <Text variant="caption" color="secondary" numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </Pressable>

          {draftName !== null ? (
            <>
              <TextField
                label="Full name"
                autoFocus
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="done"
                onSubmitEditing={saveName}
                value={draftName}
                onChangeText={setDraftName}
                errorMessage={nameError ?? undefined}
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="outline"
                    onPress={stopEditingName}
                    disabled={isSavingName}
                    fullWidth
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Save"
                    variant="accent"
                    onPress={saveName}
                    loading={isSavingName}
                    fullWidth
                  />
                </View>
              </View>
            </>
          ) : null}
        </Card>

        <Card padded={false}>
          <ProfileRow
            icon="hardware-chip-outline"
            label="Devices"
            value={DEVICE_STATUS_LABEL[connectionState]}
            href="/(tabs)/devices"
          />
          <ProfileRow icon="list-outline" label="Sessions" href="/(tabs)/sessions" divider />
          <ProfileRow icon="time-outline" label="History" href="/(tabs)/history" divider />
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
