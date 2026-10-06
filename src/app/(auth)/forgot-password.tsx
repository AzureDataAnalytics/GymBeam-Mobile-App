import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';
import { z } from 'zod';

import { Button, Screen, Text, TextField, useTheme } from '@/design-system';
import { AuthLogo, PasswordVisibilityToggle } from '@/features/auth/AuthFormParts';
import { AuthError, authService } from '@/services/auth';

const emailSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

const resetSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'At least 8 characters'),
});

type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

function messageFor(error: unknown): string {
  return error instanceof AuthError ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Accounts live only on this phone, so the reset happens here too: a code is
 * emailed to the account's address, and entering it lets the user set a new
 * password.
 */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  // Set once a code has been emailed; moves the screen to its second step.
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <Screen scroll>
      <View style={{ flex: 1, paddingTop: theme.spacing.xxl }}>
        <AuthLogo />

        <View style={{ marginTop: theme.spacing.xxxl }}>
          {sentTo ? (
            <ResetStep email={sentTo} onChangeEmail={() => setSentTo(null)} />
          ) : (
            <EmailStep onSent={setSentTo} />
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
          <Link href="/(auth)/login" replace>
            <Text color="link">Back to Sign In</Text>
          </Link>
        </View>
      </View>
    </Screen>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await authService.requestPasswordReset(email);
      onSent(email.trim());
    } catch (caught) {
      setError(messageFor(caught));
    }
  });

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="subtitle" accessibilityRole="header">
          Reset password
        </Text>
        <Text color="secondary">Enter your account email and we’ll send you a 6-digit code.</Text>
      </View>

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
            returnKeyType="send"
            onSubmitEditing={onSubmit}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorMessage={errors.email?.message}
          />
        )}
      />

      {error ? (
        <Text color="danger" variant="caption">
          {error}
        </Text>
      ) : null}

      <Button
        label="Send Code"
        variant="accent"
        size="lg"
        onPress={onSubmit}
        loading={isSubmitting}
        fullWidth
      />
    </View>
  );
}

function ResetStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ code, newPassword }) => {
    setError(null);
    setNotice(null);
    try {
      await authService.resetPassword({ email, code, newPassword });
      Alert.alert('Password updated', 'Sign in with your new password.');
      router.replace('/(auth)/login');
    } catch (caught) {
      setError(messageFor(caught));
    }
  });

  const resend = async () => {
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      await authService.requestPasswordReset(email);
      setNotice('We sent a new code. The earlier one no longer works.');
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="subtitle" accessibilityRole="header">
          Check your email
        </Text>
        <Text color="secondary">{`We sent a 6-digit code to ${email}. It works for 15 minutes.`}</Text>
      </View>

      <Controller
        control={control}
        name="code"
        render={({ field }) => (
          <TextField
            label="6-digit code"
            hideLabel
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorMessage={errors.code?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="newPassword"
        render={({ field }) => (
          <TextField
            label="New password"
            hideLabel
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            errorMessage={errors.newPassword?.message}
            trailing={
              <PasswordVisibilityToggle
                visible={passwordVisible}
                onToggle={() => setPasswordVisible((visible) => !visible)}
              />
            }
          />
        )}
      />

      {error ? (
        <Text color="danger" variant="caption">
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text color="secondary" variant="caption">
          {notice}
        </Text>
      ) : null}

      <Button
        label="Reset Password"
        variant="accent"
        size="lg"
        onPress={onSubmit}
        loading={isSubmitting}
        fullWidth
      />

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Send a new code"
            variant="outline"
            onPress={resend}
            loading={isResending}
            fullWidth
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Change email" variant="outline" onPress={onChangeEmail} fullWidth />
        </View>
      </View>
    </View>
  );
}
