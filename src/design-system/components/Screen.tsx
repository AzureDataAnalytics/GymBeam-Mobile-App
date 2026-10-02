import { type PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

export interface ScreenProps {
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
}

/** Standard screen wrapper: safe-area aware, themed background, optional scroll. */
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
        <ScrollView contentContainerStyle={{ padding, flexGrow: 1 }}>{children}</ScrollView>
      ) : (
        <View style={[styles.flex, { padding }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
