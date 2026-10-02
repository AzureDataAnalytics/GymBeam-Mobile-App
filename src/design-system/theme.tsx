import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { type ColorScheme, colors, radius, shadow, spacing, typography } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: (typeof colors)[ColorScheme];
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
}

function buildTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: colors[scheme], spacing, radius, typography, shadow };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

/**
 * Respects the OS light/dark preference by default (spec section 5). A future
 * settings screen can override this with a stored preference by wiring a
 * value from `state/settingsStore` into `forcedScheme` here.
 */
export function ThemeProvider({
  children,
  forcedScheme,
}: PropsWithChildren<{ forcedScheme?: ColorScheme }>) {
  const systemScheme = useColorScheme();
  const scheme = forcedScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
