import { Link } from 'expo-router';
import { View } from 'react-native';

import { Button, Screen, Text, useTheme } from '@/design-system';

export default function WelcomeScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View
        style={{ flex: 1, justifyContent: 'space-between', paddingVertical: theme.spacing.xxl }}
      >
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xxxl }}>
          <Text variant="label" color="tint">
            GYMBEAM
          </Text>
          <Text variant="display">Precision reaction training.</Text>
          <Text variant="body" color="secondary">
            Connect your GymBeam device, run laser-target drills, and track every session.
          </Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Link href="/(auth)/register" asChild>
            <Button label="Create account" fullWidth />
          </Link>
          <Link href="/(auth)/login" asChild>
            <Button label="Sign in" variant="outline" fullWidth />
          </Link>
        </View>
      </View>
    </Screen>
  );
}
