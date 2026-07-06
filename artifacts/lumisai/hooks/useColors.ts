import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

type ColorPalette = typeof colors.light;

/**
 * Returns the design tokens for the current color scheme.
 * Supports both light and dark palettes defined in constants/colors.ts.
 */
export function useColors(): ColorPalette & { radius: number } {
  const scheme = useColorScheme();
  const palette: ColorPalette =
    scheme === 'dark' && 'dark' in colors
      ? (colors.dark as ColorPalette)
      : colors.light;
  return { ...palette, radius: colors.radius };
}
