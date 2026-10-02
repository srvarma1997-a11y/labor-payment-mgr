import { useState, useMemo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useAllBills, useSites } from "@/src/lib/hooks";
import { money, prettyDate } from "@/src/lib/format";
import type { Bill } from "@/src/lib/types";

export default function AllBillingScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data: bills, isLoading, isError, refetch, isRefetching } = useAllBills();
  const { data: sites } = useSites();

  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [filterGst, setFilterGst] = useState<"all" | "gst" | "nongst">("all");

  const filtered = useMemo(() => {
    if (!bills) return [];
    return bills.filter((b) => {
      if (selectedSite !== "all" && b.site_id !== selectedSite) return false;
      if (filterGst === "gst" && !b.gst) return false;
      if (filterGst === "nongst" && b.gst) return false;
      return true;
    });
  }, [bills, selectedSite, filterGst]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => ({
        billed: acc.billed + b.amount,
        received: acc.received + b.payment_received,
        balance: acc.balance + b.balance,
      }),
      { billed: 0, received: 0, balance: 0 },
    );
  }, [filtered]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader title="All Bills / सब बिल" />
        <LoadingView />
      </View>
    );
  }

  if (isError || !bills) {
    return (
      <View style={styles.root}>
        <AppHeader title="All Bills / सब बिल" />
        <ErrorView onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Billing / सब बिल"
        subtitle={`${filtered.length} bills`}
      />

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Card style={styles.sumCard}>
              <View style={styles.sumCol}>
                <Text style={styles.sumLabel}>Total Billed</Text>
                <Text style={styles.sumValue}>{money(totals.billed)}</Text>
              </View>
              <View style={styles.sumDivider} />
              <View style={styles.sumCol}>
                <Text style={styles.sumLabel}>Received</Text>
                <Text style={[styles.sumValue, { color: colors.success }]}>{money(totals.received)}</Text>
              </View>
              <View style={styles.sumDivider} />
              <View style={styles.sumCol}>
                <Text style={styles.sumLabel}>Baaki / Due</Text>
                <Text style={[styles.sumValue, { color: totals.balance > 0 ? colors.error : colors.success }]}>
                  {money(totals.balance)}
                </Text>
              </View>
            </Card>

            {/* GST Filter row */}
            <View style={styles.chipRowWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Pressable
                  testID="filter-all-gst"
                  onPress={() => setFilterGst("all")}
                  style={[styles.chip, filterGst === "all" && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filterGst === "all" && styles.chipTextActive]}>Sabhi Bills</Text>
                </Pressable>
                <Pressable
                  testID="filter-gst"
                  onPress={() => setFilterGst("gst")}
                  style={[styles.chip, filterGst === "gst" && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filterGst === "gst" && styles.chipTextActive]}>GST Bills</Text>
                </Pressable>
                <Pressable
                  testID="filter-nongst"
                  onPress={() => setFilterGst("nongst")}
                  style={[styles.chip, filterGst === "nongst" && styles.chipActive]}
                >
                  <Text style={[styles.chipText, filterGst === "nongst" && styles.chipTextActive]}>Without GST</Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Site Filter row */}
            {sites && sites.length > 1 ? (
              <View style={styles.chipRowWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Pressable
                    testID="site-filter-all"
                    onPress={() => setSelectedSite("all")}
                    style={[styles.siteChip, selectedSite === "all" && styles.siteChipActive]}
                  >
                    <Text style={[styles.siteChipText, selectedSite === "all" && styles.siteChipTextActive]}>All Sites</Text>
                  </Pressable>
                  {sites.map((s) => (
                    <Pressable
                      key={s.id}
                      testID={`site-filter-${s.id}`}
                      onPress={() => setSelectedSite(s.id)}
                      style={[styles.siteChip, selectedSite === s.id && styles.siteChipActive]}
                    >
                      <Text style={[styles.siteChipText, selectedSite === s.id && styles.siteChipTextActive]}>{s.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Koi bill nahi mila"
            subtitle="Site par jakar bill add karein. GST aur non-GST dono track hote hain."
            testID="empty-all-bills"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`all-bill-${item.id}`}
            onPress={() => router.push(`/site/${item.site_id}/billing` as any)}
          >
            <Card style={styles.billCard}>
              <View style={styles.billTop}>
                <View style={styles.billNoWrap}>
                  <Text style={styles.billNo}>#{item.bill_no}</Text>
                  <View style={[styles.gstTag, item.gst ? styles.gstOn : styles.gstOff]}>
                    <Text style={[styles.gstText, { color: item.gst ? colors.onBrandPrimary : colors.onSurfaceTertiary }]}>
                      {item.gst ? "GST" : "Non-GST"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.billAmount}>{money(item.amount)}</Text>
              </View>
              <View style={styles.billMid}>
                <View style={styles.siteBadge}>
                  <Icon name="business" size={13} color={colors.brandPrimary} />
                  <Text style={styles.siteBadgeText}>{(item as any).site_name ?? "Site"}</Text>
                </View>
                <Text style={styles.billDate}>{prettyDate(item.date)}</Text>
              </View>
              <View style={styles.billBottom}>
                <View style={styles.bpCol}>
                  <Text style={styles.bpLabel}>Received</Text>
                  <Text style={[styles.bpValue, { color: colors.success }]}>{money(item.payment_received)}</Text>
                </View>
                <View style={styles.bpCol}>
                  <Text style={styles.bpLabel}>Baaki / Balance</Text>
                  <Text style={[styles.bpValue, { color: item.balance > 0 ? colors.error : colors.success }]}>
                    {money(item.balance)}
                  </Text>
                </View>
              </View>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  headerBlock: { gap: spacing.md, marginBottom: spacing.xs },
  sumCard: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg },
  sumCol: { flex: 1, alignItems: "center", gap: 2 },
  sumLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  sumValue: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.onSurface },
  sumDivider: { width: 1, height: 32, backgroundColor: colors.border },
  chipRowWrap: { height: 42, justifyContent: "center" },
  chipRow: { gap: spacing.sm, paddingHorizontal: 2 },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.textSemibold, fontSize: 13, color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onBrandPrimary },
  siteChip: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  siteChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  siteChipText: { fontFamily: fonts.textMedium, fontSize: 12, color: colors.muted },
  siteChipTextActive: { fontFamily: fonts.textBold, color: colors.brandPrimary },
  billCard: { gap: spacing.sm },
  billTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  billNoWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  billNo: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.onSurface },
  gstTag: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  gstOn: { backgroundColor: colors.brandPrimary },
  gstOff: { backgroundColor: colors.surfaceTertiary },
  gstText: { fontFamily: fonts.textBold, fontSize: 10 },
  billAmount: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
  billMid: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  siteBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  siteBadgeText: { fontFamily: fonts.textSemibold, fontSize: 12, color: colors.onBrandTertiary },
  billDate: { fontFamily: fonts.text, fontSize: 13, color: colors.muted },
  billBottom: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  bpCol: { flex: 1, gap: 2 },
  bpLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  bpValue: { fontFamily: fonts.displayBold, fontSize: 15 },
  note: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, fontStyle: "italic" },
}));
