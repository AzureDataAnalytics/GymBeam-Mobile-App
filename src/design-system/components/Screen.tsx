import { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

export type ScreenProps = {
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
};

export function Screen({
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  padded = true,
  children,
}: PropsWithChildren<ScreenProps>) {
  const theme = useTheme();
  const padding = padded ? theme.spacing.lg : 0;

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'android' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.flex, { padding }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
