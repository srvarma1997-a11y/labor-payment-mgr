import { forwardRef } from "react";
import { Text, TextInput, View, TextInputProps } from "react-native";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";

interface Props extends TextInputProps {
  label?: string;
  prefix?: string;
  mono?: boolean;
  testID?: string;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, prefix, mono, style, testID, ...rest },
  ref,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          testID={testID}
          placeholderTextColor={colors.muted}
          style={[styles.input, mono && styles.mono, style]}
          {...rest}
        />
      </View>
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  wrap: { gap: spacing.sm },
  label: { fontFamily: fonts.textSemibold, fontSize: 14, color: colors.onSurfaceTertiary },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefix: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface, marginRight: spacing.xs },
  input: { flex: 1, fontFamily: fonts.textMedium, fontSize: 17, color: colors.onSurface, paddingVertical: spacing.md },
  mono: { fontFamily: fonts.display },
}));
