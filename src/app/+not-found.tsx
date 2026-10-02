import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Screen, Text, useTheme } from '@/design-system';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Not found' }} />
      <Screen>
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }}
        >
          <Text variant="title">This screen doesn&rsquo;t exist.</Text>
          <Link href="/">
            <Text color="tint">Go to home screen</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
