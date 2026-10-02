import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField, useTheme } from '@/design-system';
import { useAuthStore } from '@/state/authStore';

const schema = z.object({
  username: z.string().min(3, 'At least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const theme = useTheme();
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '' },
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
      <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
        <Text variant="title">Create account</Text>

        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <TextField
              label="Username"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              errorMessage={errors.username?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={field.value}
              onChangeText={field.onChange}
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
              secureTextEntry
              autoComplete="password-new"
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

        <Button label="Create account" onPress={onSubmit} loading={isSubmitting} fullWidth />
      </View>
    </Screen>
  );
}
