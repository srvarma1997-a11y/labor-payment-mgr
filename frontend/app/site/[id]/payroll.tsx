import { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { usePayroll } from "@/src/lib/hooks";
import { money, num, prettyMonth, shiftMonth, currentMonthStr } from "@/src/lib/format";
import type { PayrollRow } from "@/src/lib/types";

export default function Payroll() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const siteId = String(id);

  const [month, setMonth] = useState(currentMonthStr());
  const { data, isLoading, isError, refetch } = usePayroll(siteId, month);
  const isCurrent = month === currentMonthStr();

  return (
    <View style={styles.root}>
      <AppHeader title="Payment / पेमेंट" back />

      <View style={styles.monthBar}>
        <Pressable testID="month-prev" onPress={() => setMonth((m) => shiftMonth(m, -1))} style={styles.arrow} hitSlop={8}>
          <Icon name="chevron-back" size={20} color={colors.brandPrimary} />
        </Pressable>
        <Text style={styles.monthText}>{prettyMonth(month)}</Text>
        <Pressable
          testID="month-next"
          onPress={() => { if (!isCurrent) setMonth((m) => shiftMonth(m, 1)); }}
          style={[styles.arrow, isCurrent && styles.arrowDisabled]}
          hitSlop={8}
        >
          <Icon name="chevron-forward" size={20} color={isCurrent ? colors.muted : colors.brandPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={data.rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            data.rows.length > 0 ? (
              <Card style={styles.netCard}>
                <View style={styles.netRow}>
                  <Text style={styles.netLabel}>Is mahine dena hai / Net Payable</Text>
                  <Icon name="cash" size={18} color={colors.onBrandPrimary} />
                </View>
                <Text style={styles.netBig}>{money(data.totals.net_payable)}</Text>
                <View style={styles.netSub}>
                  <Text style={styles.netSubText}>Mazdoori {money(data.totals.earned)}</Text>
                  <Text style={styles.netSubText}>− Advance {money(data.totals.advances)}</Text>
                </View>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="Koi data nahi"
              subtitle="Is mahine ki hajari lagaayein, phir yahan har labour ka payment dikhega."
              testID="empty-payroll"
            />
          }
          renderItem={({ item }: { item: PayrollRow }) => (
            <Card style={styles.row} testID={`payroll-${item.id}`}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.net}>{money(item.net_payable)}</Text>
              </View>
              <View style={styles.rowStats}>
                <Stat label="Full" value={String(item.full_days)} />
                <Stat label="Half" value={String(item.half_days)} />
                <Stat label="Din" value={num(item.day_value)} />
                <Stat label="Mazdoori" value={money(item.earned)} />
                <Stat label="Advance" value={money(item.advances)} accent />
              </View>
            </Card>
          )}
        />
      )}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statAccent]} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  monthBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  arrow: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  arrowDisabled: { backgroundColor: colors.surfaceTertiary },
  monthText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
  list: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  netCard: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary, gap: spacing.xs, marginBottom: spacing.xs },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontFamily: fonts.textSemibold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  netBig: { fontFamily: fonts.displayBold, fontSize: 32, color: colors.onBrandPrimary },
  netSub: { flexDirection: "row", gap: spacing.lg },
  netSubText: { fontFamily: fonts.display, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  row: { gap: spacing.md },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { flex: 1, fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  net: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.brandPrimary },
  rowStats: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.onSurface },
  statAccent: { color: colors.error },
  statLabel: { fontFamily: fonts.text, fontSize: 10, color: colors.muted },
}));
