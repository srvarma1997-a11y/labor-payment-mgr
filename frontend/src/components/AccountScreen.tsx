import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";
import { useAuth } from "@/src/auth/AuthContext";

export function AccountScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Account / खाता" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name?.[0] ?? "U").toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Icon
              name={user?.role === "owner" ? "ribbon" : "construct"}
              size={14}
              color={colors.onBrandTertiary}
            />
            <Text style={styles.roleText}>{user?.role === "owner" ? "Owner / Thekedar" : "Supervisor"}</Text>
          </View>
          <View style={styles.phoneRow}>
            <Icon name="call-outline" size={16} color={colors.muted} />
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="information-circle-outline" size={20} color={colors.brandPrimary} />
            <Text style={styles.infoText}>
              Aapka data surakshit hai. Har site ka hisaab real-time update hota hai jab supervisor daily report upload karta hai.
            </Text>
          </View>
        </Card>

        <Button testID="logout-button" title="Logout" variant="danger" icon="log-out-outline" onPress={doLogout} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  profile: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: radius.pill, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 32, color: colors.onBrandPrimary },
  name: { fontFamily: fonts.textBold, fontSize: 22, color: colors.onSurface },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  roleText: { fontFamily: fonts.textSemibold, fontSize: 13, color: colors.onBrandTertiary },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs },
  phone: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurfaceTertiary },
  infoCard: {},
  infoRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  infoText: { flex: 1, fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, lineHeight: 19 },
}));
