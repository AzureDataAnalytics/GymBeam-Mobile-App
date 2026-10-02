import { Redirect } from 'expo-router';

import { LoadingState, Screen } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

export default function Index() {
  const status = useAuthStore((state) => state.status);

  if (status === 'unknown') {
    return (
      <Screen>
        <LoadingState label="Starting GymBeam…" />
      </Screen>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/(auth)/welcome'} />;
}
