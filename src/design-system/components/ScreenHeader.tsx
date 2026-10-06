import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { minTouchTarget } from '../tokens';
import { Text } from './Text';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
}

export function ScreenHeader({ title, onBack, trailing }: ScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        minHeight: 56,
        paddingLeft: onBack ? theme.spacing.xs : theme.spacing.lg,
        paddingRight: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={{
            width: minTouchTarget,
            height: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
      ) : null}
      <Text variant="subtitle" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}
