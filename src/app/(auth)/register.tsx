import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField, useTheme } from '@/design-system';
import { AuthLogo, AuthTermsNotice, PasswordVisibilityToggle } from '@/features/auth/AuthFormParts';
import { useAuthStore } from '@/state/authStore';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const theme = useTheme();
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await register(values);
      router.replace('/(auth)/login');
    } catch {
      // Error surfaced via the store's `error` field below.
    }
  });

  return (
    <Screen scroll>
      <View style={{ flex: 1, paddingTop: theme.spacing.xxl }}>
        <AuthLogo />

        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xxl }}>
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextField
                label="Full Name"
                hideLabel
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.fullName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label="Email"
                hideLabel
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label="Password"
                hideLabel
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                errorMessage={errors.password?.message}
                trailing={
                  <PasswordVisibilityToggle
                    visible={passwordVisible}
                    onToggle={() => setPasswordVisible((visible) => !visible)}
                  />
                }
              />
            )}
          />
        </View>

        {error ? (
          <Text color="danger" variant="caption" style={{ marginTop: theme.spacing.md }}>
            {error}
          </Text>
        ) : null}

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button
            label="Sign Up"
            variant="accent"
            size="lg"
            onPress={onSubmit}
            loading={isSubmitting}
            fullWidth
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.lg,
          }}
        >
          <Text variant="caption">Already have an account?</Text>
          <Link href="/(auth)/login" replace>
            <Text variant="caption" color="link" style={{ fontWeight: '600' }}>
              Sign In
            </Text>
          </Link>
        </View>

        <AuthTermsNotice />
      </View>
    </Screen>
  );
}
