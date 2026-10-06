import { View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a moment.',
  onRetry,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.xxl,
      }}
    >
      <Text variant="subtitle" color="danger" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
        {description}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Button label="Try again" variant="outline" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
