import { View, Text, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useReports } from "@/src/lib/hooks";
import { money, num, prettyDate } from "@/src/lib/format";
import type { DailyReport } from "@/src/lib/types";

export default function Reports() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const siteId = String(id);
  const { data, isLoading, isError, refetch, isRefetching } = useReports(siteId);

  return (
    <View style={styles.root}>
      <AppHeader title="Daily Reports / रिपोर्ट" back />
      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => r.date}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={
            <EmptyState
              title="Koi report nahi"
              subtitle="Jab supervisor roz ki hajari upload karega, har din ki report yahan dikhegi."
              testID="empty-reports"
            />
          }
          renderItem={({ item }: { item: DailyReport }) => (
            <Card style={styles.card} testID={`report-${item.date}`}>
              <View style={styles.left}>
                <Icon name="document-text" size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.date}>{prettyDate(item.date)}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Icon name="people-outline" size={14} color={colors.muted} />
                    <Text style={styles.metaText}>{item.present_count} present</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Icon name="cash-outline" size={14} color={colors.muted} />
                    <Text style={styles.metaText}>{money(item.wage_total)}</Text>
                  </View>
                </View>
                {item.submitted_by_name ? (
                  <Text style={styles.by}>by {item.submitted_by_name}</Text>
                ) : null}
                {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysValue}>{num(item.day_total)}</Text>
                <Text style={styles.daysLabel}>din</Text>
              </View>
            </Card>
          )}
        />
      )}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.sm },
  card: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  left: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  date: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  metaRow: { flexDirection: "row", gap: spacing.lg, marginTop: 3 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: fonts.display, fontSize: 13, color: colors.onSurfaceTertiary },
  by: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 2 },
  note: { fontFamily: fonts.text, fontSize: 12, color: colors.onSurfaceTertiary, fontStyle: "italic", marginTop: 2 },
  daysBadge: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 54 },
  daysValue: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.brandPrimary },
  daysLabel: { fontFamily: fonts.text, fontSize: 10, color: colors.muted },
}));
