import { View } from 'react-native';

import { EmptyState, Screen, Text, useTheme } from '@/design-system';

/**
 * The existing Drupal backend has no password-reset REST endpoint exposed
 * today (see docs/api-integration.md). This screen is a placeholder so the
 * navigation flow is complete; wire it up once that endpoint exists.
 */
export default function ForgotPasswordScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.xl }}>
        <Text variant="title">Reset password</Text>
      </View>
      <EmptyState
        title="Coming soon"
        description="Password reset isn't available yet. Contact support to regain access to your account."
      />
    </Screen>
  );
}
