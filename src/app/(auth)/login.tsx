import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField, useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

const schema = z.object({
  username: z.string().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
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
      <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
        <Text variant="title">Sign in</Text>

        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <TextField
              label="Username"
              autoCapitalize="none"
              autoComplete="username"
              value={field.value}
              onChangeText={field.onChange}
              errorMessage={errors.username?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Password"
              secureTextEntry
              autoComplete="password"
              value={field.value}
              onChangeText={field.onChange}
              errorMessage={errors.password?.message}
            />
          )}
        />

        {error ? (
          <Text color="danger" variant="caption">
            {error}
          </Text>
        ) : null}

        <Button label="Sign in" onPress={onSubmit} loading={isSubmitting} fullWidth />

        <Link href="/(auth)/forgot-password">
          <Text color="tint" variant="caption">
            Forgot password?
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
