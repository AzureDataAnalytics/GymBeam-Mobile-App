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
      <Text color="secondary" style={{ textAlign: 'center', marginVertical: theme.spacing.md }}>
        Or Continue with
      </Text>
      <View style={{ gap: theme.spacing.xl }}>
        <Button
          label="Google"
          variant="outline"
          size="lg"
          icon={<GoogleIcon />}
          onPress={() => showSocialUnavailable('Google')}
          fullWidth
        />
        <Button
          label="Facebook"
          variant="outline"
          size="lg"
          icon={<FacebookIcon />}
          onPress={() => showSocialUnavailable('Facebook')}
          fullWidth
        />
      </View>
    </View>
  );
}

/** Legal notice pinned to the bottom of a scrolling auth screen. */
export function AuthTermsNotice() {
  const theme = useTheme();

  return (
    <View style={{ marginTop: 'auto', paddingTop: theme.spacing.xxxl, gap: theme.spacing.md }}>
      <Text variant="caption" color="secondary" style={{ opacity: 0.6 }}>
        By continuing with your account, Google or Facebook, you agree to GymBeam’s Terms of
        Service.
      </Text>
      <Text variant="caption" color="secondary" style={{ opacity: 0.6 }}>
        Our{' '}
        <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
          Terms and Privacy Policy.
        </Text>
      </Text>
    </View>
  );
}
