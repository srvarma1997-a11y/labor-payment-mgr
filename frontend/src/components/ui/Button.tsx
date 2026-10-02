import { ActivityIndicator, Pressable, Text, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { Icon, type IoniconName } from "./Icon";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  style?: ViewStyle;
  testID?: string;
  size?: "md" | "lg";
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  testID,
  size = "lg",
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();

  const bg: Record<Variant, string> = {
    primary: colors.brandPrimary,
    secondary: colors.brandTertiary,
    outline: colors.surfaceSecondary,
    danger: colors.error,
    ghost: "transparent",
  };
  const fg: Record<Variant, string> = {
    primary: colors.onBrandPrimary,
    secondary: colors.onBrandTertiary,
    outline: colors.onSurface,
    danger: colors.onError,
    ghost: colors.brandPrimary,
  };

  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === "md" && styles.md,
        { backgroundColor: bg[variant] },
        variant === "outline" && styles.outline,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={fg[variant]} /> : null}
          <Text style={[styles.text, { color: fg[variant] }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  md: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.sm },
  outline: { borderWidth: 1.5, borderColor: colors.borderStrong },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  text: { fontFamily: fonts.textBold, fontSize: 16 },
}));
