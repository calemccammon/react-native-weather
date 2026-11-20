import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Scheme,
} from '@material/material-color-utilities';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { seedColor } from './tokens';

const palette = themeFromSourceColor(argbFromHex(seedColor));

/**
 * The Material 3 theme, light or dark, with every colour generated from the
 * one seed colour.
 */
export function appTheme(dark: boolean): MD3Theme {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const scheme = dark ? palette.schemes.dark : palette.schemes.light;
  const color = (pick: (scheme: Scheme) => number) => hexFromArgb(pick(scheme));
  const surface = color((s) => s.surface);
  const primary = color((s) => s.primary);
  const onSurface = color((s) => s.onSurface);

  return {
    ...base,
    colors: {
      ...base.colors,
      primary,
      onPrimary: color((s) => s.onPrimary),
      primaryContainer: color((s) => s.primaryContainer),
      onPrimaryContainer: color((s) => s.onPrimaryContainer),
      secondary: color((s) => s.secondary),
      onSecondary: color((s) => s.onSecondary),
      secondaryContainer: color((s) => s.secondaryContainer),
      onSecondaryContainer: color((s) => s.onSecondaryContainer),
      tertiary: color((s) => s.tertiary),
      onTertiary: color((s) => s.onTertiary),
      tertiaryContainer: color((s) => s.tertiaryContainer),
      onTertiaryContainer: color((s) => s.onTertiaryContainer),
      error: color((s) => s.error),
      onError: color((s) => s.onError),
      errorContainer: color((s) => s.errorContainer),
      onErrorContainer: color((s) => s.onErrorContainer),
      background: color((s) => s.background),
      onBackground: color((s) => s.onBackground),
      surface,
      onSurface,
      surfaceVariant: color((s) => s.surfaceVariant),
      onSurfaceVariant: color((s) => s.onSurfaceVariant),
      outline: color((s) => s.outline),
      outlineVariant: color((s) => s.outlineVariant),
      shadow: color((s) => s.shadow),
      scrim: color((s) => s.scrim),
      inverseSurface: color((s) => s.inverseSurface),
      inverseOnSurface: color((s) => s.inverseOnSurface),
      inversePrimary: color((s) => s.inversePrimary),
      surfaceDisabled: withAlpha(onSurface, 0.12),
      onSurfaceDisabled: withAlpha(onSurface, 0.38),
      backdrop: withAlpha(
        color((s) => s.scrim),
        0.4,
      ),
      // Material 3 shows height by tinting a surface with the primary colour.
      elevation: {
        level0: 'transparent',
        level1: mix(surface, primary, 0.05),
        level2: mix(surface, primary, 0.08),
        level3: mix(surface, primary, 0.11),
        level4: mix(surface, primary, 0.12),
        level5: mix(surface, primary, 0.14),
      },
    },
  };
}

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** `over` laid on `base` at `amount` (0 to 1), as an opaque colour. */
function mix(base: string, over: string, amount: number): string {
  const [from, to] = [channels(base), channels(over)];
  const blended = from.map((channel, i) => Math.round(channel + (to[i]! - channel) * amount));
  return `#${blended.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function withAlpha(hex: string, alpha: number): string {
  const [red, green, blue] = channels(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
