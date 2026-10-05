import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField, useTheme } from '@/design-system';
import {
  AuthLogo,
  AuthTermsNotice,
  PasswordVisibilityToggle,
  SocialSignInButtons,
} from '@/features/auth/AuthFormParts';
import { useAuthStore } from '@/state/authStore';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      router.replace('/(tabs)');
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
                autoComplete="password"
                textContentType="password"
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

        <Link
          href="/(auth)/forgot-password"
          style={{ alignSelf: 'flex-end', marginTop: theme.spacing.md }}
        >
          <Text variant="caption" color="link" style={{ fontWeight: '500' }}>
            Forgot Password?
          </Text>
        </Link>

        {error ? (
          <Text color="danger" variant="caption" style={{ marginTop: theme.spacing.md }}>
            {error}
          </Text>
        ) : null}

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button
            label="Sign In"
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
          <Text variant="caption">You don’t have an account?</Text>
          <Link href="/(auth)/register" replace>
            <Text variant="caption" color="link" style={{ fontWeight: '600' }}>
              Sign Up
            </Text>
          </Link>
        </View>

        <SocialSignInButtons />

        <AuthTermsNotice />
      </View>
    </Screen>
  );
}
