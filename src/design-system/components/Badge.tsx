import { View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'tint';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const toneColor: Record<BadgeTone, string> = {
    neutral: theme.colors.textSecondary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    tint: theme.colors.tint,
  };

  const color = toneColor[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: theme.radius.full,
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: tone === 'neutral' ? theme.colors.skeleton : `${color}1A`,
      }}
    >
      <Text variant="label" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
