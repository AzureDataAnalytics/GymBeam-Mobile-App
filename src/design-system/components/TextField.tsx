import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  errorMessage?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, errorMessage, style, ...rest },
  ref,
) {
  const theme = useTheme();
  const hasError = Boolean(errorMessage);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label" color="secondary">
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textSecondary}
        style={[
          {
            borderWidth: 1,
            borderColor: hasError ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            fontSize: theme.typography.size.md,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            minHeight: 48,
          },
          style,
        ]}
        {...rest}
      />
      {hasError ? (
        <Text variant="caption" color="danger">
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});
