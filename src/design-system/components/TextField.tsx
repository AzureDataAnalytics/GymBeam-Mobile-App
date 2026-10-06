import { forwardRef, type ReactNode } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label: string;
  hideLabel?: boolean;
  trailing?: ReactNode;
  errorMessage?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hideLabel = false, trailing, errorMessage, placeholder, style, ...rest },
  ref,
) {
  const theme = useTheme();
  const hasError = Boolean(errorMessage);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {hideLabel ? null : (
        <Text variant="label" color="secondary">
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: hasError ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          minHeight: hideLabel ? 56 : 48,
          paddingRight: trailing ? theme.spacing.md : 0,
        }}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholder={placeholder ?? (hideLabel ? label : undefined)}
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            {
              flex: 1,
              alignSelf: 'stretch',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              fontSize: theme.typography.size.md,
              color: theme.colors.textPrimary,
            },
            style,
          ]}
          {...rest}
        />
        {trailing}
      </View>
      {hasError ? (
        <Text variant="caption" color="danger">
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});
