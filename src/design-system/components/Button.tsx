import { ActivityIndicator, Pressable, type PressableProps, StyleSheet } from 'react-native';

import { minTouchTarget } from '../tokens';
import { useTheme } from '../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const SIZE_MAP: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 12 },
  md: { paddingVertical: 12, paddingHorizontal: 16 },
  lg: { paddingVertical: 16, paddingHorizontal: 20 },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<
    ButtonVariant,
    { background: string; text: string; border?: string }
  > = {
    primary: { background: theme.colors.tint, text: theme.colors.textInverse },
    secondary: { background: theme.colors.surfaceRaised, text: theme.colors.textPrimary },
    outline: {
      background: 'transparent',
      text: theme.colors.textPrimary,
      border: theme.colors.border,
    },
    ghost: { background: 'transparent', text: theme.colors.tint },
    danger: { background: theme.colors.danger, text: theme.colors.textInverse },
  };

  const style = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        SIZE_MAP[size],
        {
          backgroundColor: style.background,
          borderColor: style.border ?? 'transparent',
          borderWidth: style.border ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
          minHeight: minTouchTarget,
          borderRadius: theme.radius.md,
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={style.text} />
      ) : (
        <Text variant="bodyStrong" style={{ color: style.text }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
