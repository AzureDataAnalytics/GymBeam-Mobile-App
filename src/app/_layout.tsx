import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';
import { useDeviceStore } from '@/state/deviceStore';
import { useHistoryStore } from '@/state/historyStore';

function RootNavigator() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const hydrateDevice = useDeviceStore((state) => state.hydrate);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const loadHistory = useHistoryStore((state) => state.load);

  useEffect(() => {
    bootstrap();
    hydrateDevice();
  }, [bootstrap, hydrateDevice]);

  useEffect(() => {
    loadHistory(userId);
  }, [loadHistory, userId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
