import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";

export interface Segment<T extends string> {
  value: T;
  label: string;
  activeColor?: string;
  activeTextColor?: string;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  testIDPrefix,
}: Props<T>) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.track}>
      {segments.map((seg) => {
        const active = seg.value === value;
        const activeBg = seg.activeColor ?? colors.brandPrimary;
        const activeFg = seg.activeTextColor ?? colors.onBrandPrimary;
        return (
          <Pressable
            key={seg.value}
            testID={testIDPrefix ? `${testIDPrefix}-${seg.value}` : undefined}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              onChange(seg.value);
            }}
            style={[styles.seg, active && { backgroundColor: activeBg }]}
          >
            <Text style={[styles.segText, { color: active ? activeFg : colors.onSurfaceTertiary }]}>
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  track: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  seg: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  segText: { fontFamily: fonts.textBold, fontSize: 14 },
}));
