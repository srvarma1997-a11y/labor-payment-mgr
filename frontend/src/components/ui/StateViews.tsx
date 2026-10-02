import { View, Text, ActivityIndicator } from "react-native";
import { makeStyles, useTheme, fonts, spacing } from "@/src/theme";
import { Button } from "./Button";

export function LoadingView({ testID }: { testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center} testID={testID ?? "loading-view"}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

export function ErrorView({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.center} testID="error-view">
      <Text style={styles.errText}>{message ?? "Kuch galat ho gaya / Something went wrong"}</Text>
      {onRetry ? <Button title="Retry / फिर से" variant="outline" size="md" onPress={onRetry} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  errText: { fontFamily: fonts.textMedium, fontSize: 15, color: colors.muted, textAlign: "center" },
}));
