import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useToast } from "@/src/components/ui/Toast";
import { useAuth } from "@/src/auth/AuthContext";
import { useDashboard, useCreateSite } from "@/src/lib/hooks";
import { money, prettyMonth } from "@/src/lib/format";
import type { DashboardSite } from "@/src/lib/types";

export default function OwnerDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useDashboard();
  const createSite = useCreateSite();

  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

  const submit = useCallback(async () => {
    if (!name.trim()) return toast.show("Site ka naam daalein", "error");
    try {
      await createSite.mutateAsync({ name: name.trim(), company_name: company.trim(), location: location.trim() });
      toast.show("Site add ho gayi", "success");
      setSheet(false);
      setName("");
      setCompany("");
      setLocation("");
    } catch {
      toast.show("Site add nahi hui", "error");
    }
  }, [name, company, location, createSite, toast]);

  const renderSite = useCallback(
    ({ item, index }: { item: DashboardSite; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <Pressable testID={`site-card-${item.id}`} onPress={() => router.push(`/site/${item.id}`)}>
          <Card style={styles.siteCard}>
            <View style={styles.siteTop}>
              <View style={styles.siteIcon}>
                <Icon name="business" size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.siteName} numberOfLines={1}>{item.name}</Text>
                {item.company_name ? (
                  <Text style={styles.siteCompany} numberOfLines={1}>{item.company_name}</Text>
                ) : null}
              </View>
              <View style={[styles.todayBadge, item.today_uploaded ? styles.badgeGreen : styles.badgeGrey]}>
                <Icon
                  name={item.today_uploaded ? "checkmark-circle" : "time-outline"}
                  size={14}
                  color={item.today_uploaded ? colors.success : colors.muted}
                />
                <Text style={[styles.badgeText, { color: item.today_uploaded ? colors.success : colors.muted }]}>
                  {item.today_present} aaj
                </Text>
              </View>
            </View>
            <View style={styles.siteStats}>
              <SiteMini label="Labour" value={String(item.labour_count)} />
              <View style={styles.vline} />
              <SiteMini label="Baaki / Due" value={money(item.balance)} accent={item.balance > 0} />
              <View style={styles.vline} />
              <SiteMini label="Billed" value={money(item.total_billed)} />
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    ),
    [router, styles, colors],
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader title="Home" />
        <LoadingView />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.root}>
        <AppHeader title="Home" />
        <ErrorView onRetry={refetch} />
      </View>
    );
  }

  const t = data.totals;

  return (
    <View style={styles.root}>
      <AppHeader
        title={`Namaste, ${user?.name?.split(" ")[0] ?? ""}`}
        subtitle={prettyMonth(data.month)}
        rightIcon="add-circle"
        onRightPress={() => setSheet(true)}
        rightTestID="add-site-button"
      />
      <FlatList
        data={data.sites}
        keyExtractor={(s) => s.id}
        renderItem={renderSite}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Card style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Baaki / Outstanding</Text>
                <Icon name="wallet-outline" size={18} color={colors.onBrandPrimary} />
              </View>
              <Text style={styles.totalBig}>{money(t.balance)}</Text>
              <View style={styles.totalSub}>
                <View style={styles.subItem}>
                  <Text style={styles.subLabel}>Billed</Text>
                  <Text style={styles.subValue}>{money(t.total_billed)}</Text>
                </View>
                <View style={styles.subItem}>
                  <Text style={styles.subLabel}>Received</Text>
                  <Text style={styles.subValue}>{money(t.total_received)}</Text>
                </View>
                <View style={styles.subItem}>
                  <Text style={styles.subLabel}>Labour (mahina)</Text>
                  <Text style={styles.subValue}>{money(t.labour_cost_month)}</Text>
                </View>
              </View>
            </Card>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Meri Sites · {t.site_count}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Abhi koi site nahi"
            subtitle="Apni pehli construction site add karein aur hajari-billing ka hisaab shuru karein."
            actionLabel="Site add karein"
            actionIcon="add"
            onAction={() => setSheet(true)}
            testID="empty-sites"
          />
        }
      />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Nayi Site / New Site" testID="site-sheet">
        <Input testID="site-name" label="Site ka naam" placeholder="Green Valley Tower" value={name} onChangeText={setName} />
        <Input testID="site-company" label="Company / Client" placeholder="ABC Builders Pvt Ltd" value={company} onChangeText={setCompany} />
        <Input testID="site-location" label="Location (optional)" placeholder="Andheri, Mumbai" value={location} onChangeText={setLocation} />
        <Button testID="save-site" title="Site save karein" onPress={submit} loading={createSite.isPending} icon="checkmark" />
      </Sheet>
    </View>
  );
}

function SiteMini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.mini}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, accent && styles.miniAccent]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  headerBlock: { gap: spacing.lg, marginBottom: spacing.xs },
  totalCard: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary, padding: spacing.xl },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: fonts.textSemibold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  totalBig: { fontFamily: fonts.displayBold, fontSize: 38, color: colors.onBrandPrimary, marginTop: spacing.xs },
  totalSub: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, gap: spacing.sm },
  subItem: { flex: 1 },
  subLabel: { fontFamily: fonts.text, fontSize: 11, color: "rgba(255,255,255,0.7)" },
  subValue: { fontFamily: fonts.display, fontSize: 15, color: colors.onBrandPrimary, marginTop: 2 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontFamily: fonts.textBold, fontSize: 17, color: colors.onSurface },
  siteCard: { gap: spacing.md },
  siteTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  siteIcon: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  siteName: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  siteCompany: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 1 },
  todayBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
  badgeGreen: { backgroundColor: colors.brandTertiary },
  badgeGrey: { backgroundColor: colors.surfaceTertiary },
  badgeText: { fontFamily: fonts.textSemibold, fontSize: 11 },
  siteStats: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  mini: { flex: 1, alignItems: "center", gap: 2 },
  miniLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  miniValue: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.onSurface },
  miniAccent: { color: colors.error },
  vline: { width: 1, height: 28, backgroundColor: colors.border },
}));
