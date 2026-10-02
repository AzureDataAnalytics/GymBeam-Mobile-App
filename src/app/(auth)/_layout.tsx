import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/state/authStore';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
