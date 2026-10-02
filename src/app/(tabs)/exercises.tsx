import { View } from 'react-native';

import { EmptyState, Screen, Text, useTheme } from '@/design-system';

/**
 * The Drupal backend has no exercise/pattern endpoints today — only drill
 * history nodes. This screen is intentionally an honest empty state rather
 * than mock exercise data dressed up as real (spec section 45); wire it to
 * TanStack Query once docs/api-integration.md's `/exercises` contract exists.
 */
export default function ExercisesScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <Text variant="title">Exercises</Text>
      </View>
      <EmptyState
        title="Exercise library coming soon"
        description="The backend doesn't have an exercises API yet. Once it does, drills you create will show up here."
      />
    </Screen>
  );
}
