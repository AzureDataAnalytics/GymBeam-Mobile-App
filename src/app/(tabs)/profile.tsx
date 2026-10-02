import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Screen, Text, useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const onSignOut = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <Screen>
      <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
        <Text variant="title">Profile</Text>

        <Card style={{ gap: theme.spacing.xxs }}>
          <Text variant="subtitle">{user?.name ?? 'Unknown user'}</Text>
          <Text variant="caption" color="secondary">
            {user?.roles.join(', ') || 'Member'}
          </Text>
        </Card>

        <Button label="Sign out" variant="danger" onPress={onSignOut} fullWidth />
      </View>
    </Screen>
  );
}
