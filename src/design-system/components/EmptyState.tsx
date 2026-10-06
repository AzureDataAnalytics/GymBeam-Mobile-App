import { View } from 'react-native';

import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.xxl,
      }}
    >
      <Text variant="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
