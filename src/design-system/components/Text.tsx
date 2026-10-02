import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme';

export type TextVariant =
  'display' | 'title' | 'subtitle' | 'body' | 'bodyStrong' | 'caption' | 'label';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: 'primary' | 'secondary' | 'inverse' | 'tint' | 'danger' | 'success' | 'warning';
}

const VARIANT_MAP: Record<
  TextVariant,
  { size: number; lineHeight: number; weight: TextStyle['fontWeight'] }
> = {
  display: { size: 34, lineHeight: 40, weight: '700' },
  title: { size: 22, lineHeight: 28, weight: '700' },
  subtitle: { size: 18, lineHeight: 24, weight: '600' },
  body: { size: 16, lineHeight: 22, weight: '400' },
  bodyStrong: { size: 16, lineHeight: 22, weight: '600' },
  caption: { size: 14, lineHeight: 20, weight: '400' },
  label: { size: 12, lineHeight: 16, weight: '600' },
};

/** Themed text primitive. Every screen should render copy through this, not raw <Text>. */
export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const theme = useTheme();
  const variantStyle = VARIANT_MAP[variant];

  const colorMap = {
    primary: theme.colors.textPrimary,
    secondary: theme.colors.textSecondary,
    inverse: theme.colors.textInverse,
    tint: theme.colors.tint,
    danger: theme.colors.danger,
    success: theme.colors.success,
    warning: theme.colors.warning,
  } as const;

  return (
    <RNText
      accessibilityRole="text"
      style={[
        {
          fontSize: variantStyle.size,
          lineHeight: variantStyle.lineHeight,
          fontWeight: variantStyle.weight,
          color: colorMap[color],
        },
        style,
      ]}
      {...rest}
    />
  );
}
