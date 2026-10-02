import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, IoniconName> = {
  index: 'home',
  exercises: 'barbell',
  sessions: 'flash',
  devices: 'hardware-chip',
  profile: 'person',
};

export default function TabsLayout() {
  const theme = useTheme();
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tint,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] ?? 'ellipse'} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Tabs.Screen name="devices" options={{ title: 'Devices' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
