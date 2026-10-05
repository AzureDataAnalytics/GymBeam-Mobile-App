import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Screen, useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

export default function Index() {
  const theme = useTheme();
  const status = useAuthStore((state) => state.status);

  if (status === 'unknown') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/(auth)/login'} />;
}
