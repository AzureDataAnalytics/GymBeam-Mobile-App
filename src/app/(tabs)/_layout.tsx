import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

export default function TabsLayout() {
  const theme = useTheme();
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="drill"
        options={{
          title: 'Drill',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="run-fast" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
      {/* Not in the tab bar; still routable (Home links to them). */}
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="sessions" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
    </Tabs>
  );
}
