import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

function TabIcon({ focused, children }: { focused: boolean; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 56,
        height: 30,
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.colors.accentSoft : 'transparent',
      }}
    >
      {children}
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: theme.spacing.xs,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarIconStyle: { width: 56, height: 30 },
        tabBarLabelStyle: { fontSize: theme.typography.size.xs, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name="home-outline" color={color} size={24} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="drill"
        options={{
          title: 'Drill',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <MaterialCommunityIcons name="target" color={color} size={24} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Ionicons name="person-outline" color={color} size={24} />
            </TabIcon>
          ),
        }}
      />
      {/* Not in the tab bar; still routable (Home links to them). */}
      <Tabs.Screen name="exercises" options={{ href: null }} />
      <Tabs.Screen name="sessions" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
    </Tabs>
  );
}
