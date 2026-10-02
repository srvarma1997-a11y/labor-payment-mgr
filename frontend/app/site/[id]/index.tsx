import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { Card } from "@/src/components/ui/Card";
import { Icon, type IoniconName } from "@/src/components/ui/Icon";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Sheet } from "@/src/components/ui/Sheet";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useToast } from "@/src/components/ui/Toast";
import { useAuth } from "@/src/auth/AuthContext";
import { useSiteSummary, useUpdateSite, useDeleteSite } from "@/src/lib/hooks";
import { money, num, prettyMonth, todayStr } from "@/src/lib/format";

const HERO = "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

interface Action { key: string; label: string; hindi: string; icon: IoniconName; route: string }

export default function SiteWorkspace() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const siteId = String(id);
  const { data, isLoading, isError, refetch } = useSiteSummary(siteId);
  const updateSite = useUpdateSite(siteId);
  const deleteSite = useDeleteSite();

  const isOwner = user?.role === "owner";
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

  const openEdit = () => {
    if (!data) return;
    setName(data.site.name);
    setCompany(data.site.company_name);
    setLocation(data.site.location);
    setEdit(true);
  };

  const saveEdit = useCallback(async () => {
    if (!name.trim()) return toast.show("Naam daalein", "error");
    try {
      await updateSite.mutateAsync({ name: name.trim(), company_name: company.trim(), location: location.trim() });
      toast.show("Site update ho gayi", "success");
      setEdit(false);
    } catch {
      toast.show("Update nahi hui", "error");
    }
  }, [name, company, location, updateSite, toast]);

  const doDelete = () => {
    deleteSite.mutate(siteId, {
      onSuccess: () => {
        toast.show("Site hata di", "success");
        router.back();
      },
      onError: () => toast.show("Delete nahi hui", "error"),
    });
  };

  if (isLoading) return <View style={styles.root}><LoadingView /></View>;
  if (isError || !data) return <View style={styles.root}><ErrorView onRetry={refetch} /></View>;

  const actions: Action[] = [
    { key: "attendance", label: "Attendance", hindi: "हाज़िरी", icon: "calendar", route: `/site/${siteId}/attendance` },
    { key: "labourers", label: "Labour", hindi: "मज़दूर", icon: "people", route: `/site/${siteId}/labourers` },
    { key: "payroll", label: "Payment", hindi: "पेमेंट", icon: "cash", route: `/site/${siteId}/payroll` },
    { key: "advances", label: "Advance", hindi: "एडवांस", icon: "wallet", route: `/site/${siteId}/advances` },
    { key: "billing", label: "Billing", hindi: "बिल", icon: "receipt", route: `/site/${siteId}/billing` },
    { key: "reports", label: "Reports", hindi: "रिपोर्ट", icon: "document-text", route: `/site/${siteId}/reports` },
  ];

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={["rgba(28,28,30,0.25)", "rgba(28,28,30,0.92)"]} style={styles.scrim} />
          <View style={[styles.heroTop, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable testID="header-back" onPress={() => router.back()} style={styles.circleBtn} hitSlop={8}>
              <Icon name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            {isOwner ? (
              <Pressable testID="edit-site-button" onPress={openEdit} style={styles.circleBtn} hitSlop={8}>
                <Icon name="create-outline" size={22} color="#FFFFFF" />
              </Pressable>
            ) : <View style={styles.circleBtn} />}
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName}>{data.site.name}</Text>
            {data.site.company_name ? <Text style={styles.heroCompany}>{data.site.company_name}</Text> : null}
            {data.site.location ? (
              <View style={styles.locRow}>
                <Icon name="location" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroLoc}>{data.site.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <Card style={styles.summaryCard}>
            <View style={styles.sumHeaderRow}>
              <Text style={styles.sumTitle}>Is mahine · {prettyMonth(data.month)}</Text>
              <View style={[styles.todayPill, data.today_uploaded ? styles.pillGreen : styles.pillGrey]}>
                <Icon name={data.today_uploaded ? "checkmark-circle" : "time-outline"} size={13} color={data.today_uploaded ? colors.success : colors.muted} />
                <Text style={[styles.todayPillText, { color: data.today_uploaded ? colors.success : colors.muted }]}>
                  Aaj {data.today_present} present
                </Text>
              </View>
            </View>
            <View style={styles.sumGrid}>
              <Metric label="Labour" value={String(data.labour_count)} icon="people-outline" />
              <Metric label="Mazdoori" value={money(data.labour.earned)} icon="cash-outline" />
              <Metric label="Advance" value={money(data.labour.advances)} icon="wallet-outline" />
            </View>
            <View style={styles.divider} />
            <View style={styles.billingRow}>
              <View style={styles.billCol}>
                <Text style={styles.billLabel}>Billed</Text>
                <Text style={styles.billValue}>{money(data.billing.total_billed)}</Text>
              </View>
              <View style={styles.billCol}>
                <Text style={styles.billLabel}>Received</Text>
                <Text style={styles.billValue}>{money(data.billing.total_received)}</Text>
              </View>
              <View style={styles.billCol}>
                <Text style={styles.billLabel}>Baaki / Due</Text>
                <Text style={[styles.billValue, { color: data.billing.balance > 0 ? colors.error : colors.success }]}>
                  {money(data.billing.balance)}
                </Text>
              </View>
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            {actions.map((a) => (
              <Pressable key={a.key} testID={`action-${a.key}`} style={styles.tile} onPress={() => router.push(a.route as any)}>
                <View style={styles.tileIcon}>
                  <Icon name={a.icon} size={24} color={colors.brandPrimary} />
                </View>
                <Text style={styles.tileLabel}>{a.label}</Text>
                <Text style={styles.tileHindi}>{a.hindi}</Text>
              </Pressable>
            ))}
          </View>

          {isOwner ? (
            <Button
              testID="delete-site-button"
              title="Site delete karein"
              variant="ghost"
              icon="trash-outline"
              onPress={doDelete}
              style={{ marginTop: spacing.sm }}
            />
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          testID="mark-attendance-cta"
          title="Aaj ki Hajari lagayein"
          icon="calendar"
          onPress={() => router.push(`/site/${siteId}/attendance?date=${todayStr()}`)}
        />
      </View>

      <Sheet visible={edit} onClose={() => setEdit(false)} title="Site edit karein" testID="edit-sheet">
        <Input testID="edit-name" label="Site ka naam" value={name} onChangeText={setName} />
        <Input testID="edit-company" label="Company / Client" value={company} onChangeText={setCompany} />
        <Input testID="edit-location" label="Location" value={location} onChangeText={setLocation} />
        <Button testID="save-edit" title="Save karein" onPress={saveEdit} loading={updateSite.isPending} icon="checkmark" />
      </Sheet>
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: IoniconName }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Icon name={icon} size={16} color={colors.muted} />
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 230 },
  heroImg: { ...abs() },
  scrim: { ...abs() },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md },
  circleBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  heroText: { position: "absolute", left: spacing.xl, right: spacing.xl, bottom: spacing.xl, gap: 2 },
  heroName: { fontFamily: fonts.displayBold, fontSize: 26, color: "#FFFFFF" },
  heroCompany: { fontFamily: fonts.textSemibold, fontSize: 14, color: "rgba(255,255,255,0.9)" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  heroLoc: { fontFamily: fonts.text, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  body: { padding: spacing.lg, gap: spacing.lg, marginTop: -spacing.xl },
  summaryCard: { gap: spacing.md },
  sumHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumTitle: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  todayPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
  pillGreen: { backgroundColor: colors.brandTertiary },
  pillGrey: { backgroundColor: colors.surfaceTertiary },
  todayPillText: { fontFamily: fonts.textSemibold, fontSize: 11 },
  sumGrid: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 3, alignItems: "flex-start" },
  metricValue: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.onSurface },
  metricLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border },
  billingRow: { flexDirection: "row" },
  billCol: { flex: 1, gap: 2 },
  billLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  billValue: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.onSurface },
  sectionTitle: { fontFamily: fonts.textBold, fontSize: 17, color: colors.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, gap: 4, borderWidth: 1, borderColor: colors.border,
  },
  tileIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  tileLabel: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  tileHindi: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
  sticky: {
    position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border,
  },
}));

function abs() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}
