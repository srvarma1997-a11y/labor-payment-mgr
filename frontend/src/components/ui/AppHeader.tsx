import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, fonts, spacing } from "@/src/theme";
import { Icon, type IoniconName } from "./Icon";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightIcon?: IoniconName;
  onRightPress?: () => void;
  rightTestID?: string;
}

export function AppHeader({ title, subtitle, back, rightIcon, onRightPress, rightTestID }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {back ? (
        <Pressable testID="header-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {rightIcon && onRightPress ? (
        <Pressable testID={rightTestID ?? "header-right"} onPress={onRightPress} style={styles.iconBtn} hitSlop={8}>
          <Icon name={rightIcon} size={24} color={colors.brandPrimary} />
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, alignItems: "center" },
  title: { fontFamily: fonts.textBold, fontSize: 18, color: colors.onSurface },
  subtitle: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 1 },
}));
