import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from '@/design-system';

export function ConnectPulse({
  icon,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
}) {
  const theme = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.target,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
          ],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 112,
          height: 112,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.target,
          opacity: 0.2,
        }}
      />
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: theme.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.targetStrong,
        }}
      >
        <Ionicons name={icon} size={30} color={theme.colors.onAccent} />
      </View>
    </View>
  );
}
