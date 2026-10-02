import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.xxl,
      }}
    >
      <ActivityIndicator color={theme.colors.tint} />
      <Text color="secondary">{label}</Text>
    </View>
  );
}
