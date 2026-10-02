// Design tokens for SiteHisab — "iOS-Native Clean" high-contrast utilitarian ledger.
// Keys mirror the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#F2F2F7",
  onSurface: "#1C1C1E",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1C1C1E",
  surfaceTertiary: "#E5E5EA",
  onSurfaceTertiary: "#3A3A3C",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#F2F2F7",
  muted: "#8E8E93",

  brand: "#20563E",
  onBrand: "#FFFFFF",
  brandPrimary: "#20563E",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#347958",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E7F3ED",
  onBrandTertiary: "#20563E",

  success: "#34C759",
  onSuccess: "#FFFFFF",
  warning: "#FFCC00",
  onWarning: "#1C1C1E",
  error: "#FF3B30",
  onError: "#FFFFFF",
  info: "#0A84FF",
  onInfo: "#FFFFFF",

  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#C7C7CC",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// Typography helpers — font families loaded in app/_layout.tsx via expo-font.
export const fonts = {
  display: "SpaceGrotesk-Medium", // numbers, money, counters
  displayBold: "SpaceGrotesk-Bold",
  displayRegular: "SpaceGrotesk-Regular",
  text: "PlusJakartaSans-Regular", // reading text & labels
  textMedium: "PlusJakartaSans-Medium",
  textSemibold: "PlusJakartaSans-SemiBold",
  textBold: "PlusJakartaSans-Bold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
