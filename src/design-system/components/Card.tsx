import { type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../theme';

export interface CardProps extends ViewProps {
  padded?: boolean;
  elevated?: boolean;
}

export function Card({
  padded = true,
  elevated = false,
  style,
  children,
  ...rest
}: PropsWithChildren<CardProps>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: padded ? theme.spacing.lg : 0,
        },
        elevated ? theme.shadow.md : undefined,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
  },
});
