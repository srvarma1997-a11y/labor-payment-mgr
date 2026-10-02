import { View, Text } from "react-native";
import { Image } from "expo-image";
import { makeStyles, fonts, radius, spacing } from "@/src/theme";
import { Button } from "./Button";
import type { IoniconName } from "./Icon";

export function EmptyState({
  image,
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
  testID,
}: {
  image?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IoniconName;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} testID={testID}>
      {image ? <Image source={{ uri: image }} style={styles.image} contentFit="cover" /> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} icon={actionIcon} style={styles.action} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { alignItems: "center", paddingVertical: spacing["2xl"], paddingHorizontal: spacing.xl, gap: spacing.md },
  image: { width: 140, height: 140, borderRadius: radius.lg, marginBottom: spacing.sm },
  title: { fontFamily: fonts.textBold, fontSize: 18, color: colors.onSurface, textAlign: "center" },
  subtitle: { fontFamily: fonts.text, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
  action: { marginTop: spacing.sm, alignSelf: "stretch" },
}));
