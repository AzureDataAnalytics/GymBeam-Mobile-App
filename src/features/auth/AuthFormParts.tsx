import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, View } from 'react-native';

import { Button, Text, useTheme } from '@/design-system';

import { FacebookIcon, GoogleIcon } from './ProviderIcons';

export function AuthLogo() {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      <Image
        source={require('../../../assets/icon.png')}
        accessibilityIgnoresInvertColors
        style={{ width: 88, height: 88, borderRadius: theme.radius.xl }}
      />
      <Text variant="title" accessibilityRole="header">
        GymBeam
      </Text>
    </View>
  );
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      hitSlop={12}
      onPress={onToggle}
    >
      <Ionicons
        name={visible ? 'eye-outline' : 'eye-off-outline'}
        size={24}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );
}

function showSocialUnavailable(provider: string) {
  Alert.alert(`${provider} sign-in`, `Signing in with ${provider} isn’t available yet.`);
}

export function SocialSignInButtons() {
  const theme = useTheme();

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        <Text variant="caption" color="secondary">
          Or continue with
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Google"
            variant="outline"
            icon={<GoogleIcon />}
            onPress={() => showSocialUnavailable('Google')}
            fullWidth
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Facebook"
            variant="outline"
            icon={<FacebookIcon />}
            onPress={() => showSocialUnavailable('Facebook')}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

/** Legal notice pinned to the bottom of a scrolling auth screen. */
export function AuthTermsNotice() {
  const theme = useTheme();

  return (
    <View style={{ marginTop: 'auto', paddingTop: theme.spacing.xl }}>
      <Text variant="label" color="secondary" style={{ fontWeight: '400', textAlign: 'center' }}>
        By continuing with your account, Google or Facebook, you agree to GymBeam’s{' '}
        <Text variant="label" color="secondary">
          Terms and Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}
