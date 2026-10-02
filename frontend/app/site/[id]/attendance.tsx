import { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { Icon } from "@/src/components/ui/Icon";
import { Button } from "@/src/components/ui/Button";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useToast } from "@/src/components/ui/Toast";
import { useAttendance, useSaveAttendance } from "@/src/lib/hooks";
import { money, prettyDate, shiftDate, todayStr, isToday } from "@/src/lib/format";
import type { AttendanceStatus } from "@/src/lib/types";

export default function Attendance() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  const siteId = String(params.id);

  const [date, setDate] = useState(params.date ? String(params.date) : todayStr());
  const { data, isLoading, isError, refetch } = useAttendance(siteId, date);
  const save = useSaveAttendance(siteId);

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    if (data) {
      const map: Record<string, AttendanceStatus> = {};
      data.labourers.forEach((l) => (map[l.id] = l.status));
      setStatuses(map);
    }
  }, [data]);

  const setStatus = (id: string, s: AttendanceStatus) => setStatuses((p) => ({ ...p, [id]: s }));

  const setAll = (s: AttendanceStatus) => {
    if (!data) return;
    const map: Record<string, AttendanceStatus> = {};
    data.labourers.forEach((l) => (map[l.id] = s));
    setStatuses(map);
  };

  const summary = useMemo(() => {
    if (!data) return { present: 0, wage: 0 };
    let present = 0;
    let wage = 0;
    data.labourers.forEach((l) => {
      const s = statuses[l.id] ?? "absent";
      const v = s === "full" ? 1 : s === "half" ? 0.5 : 0;
      if (v > 0) present += 1;
      wage += v * l.daily_wage;
    });
    return { present, wage };
  }, [statuses, data]);

  const onSave = useCallback(async () => {
    if (!data) return;
    const records = data.labourers.map((l) => ({ labourer_id: l.id, status: statuses[l.id] ?? "absent" }));
    try {
      await save.mutateAsync({ date, records });
      toast.show("Hajari save & report upload ho gayi", "success");
    } catch {
      toast.show("Save nahi hui", "error");
    }
  }, [data, statuses, date, save, toast]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="header-back" onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Icon name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Hajari / हाज़िरी</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.dateBar}>
        <Pressable testID="date-prev" onPress={() => setDate((d) => shiftDate(d, -1))} style={styles.dateArrow} hitSlop={8}>
          <Icon name="chevron-back" size={20} color={colors.brandPrimary} />
        </Pressable>
        <Pressable testID="date-today" onPress={() => setDate(todayStr())} style={styles.dateCenter}>
          <Text style={styles.dateText}>{prettyDate(date)}</Text>
          {!isToday(date) ? <Text style={styles.todayHint}>Tap for today</Text> : <Text style={styles.todayHint}>Aaj</Text>}
        </Pressable>
        <Pressable
          testID="date-next"
          onPress={() => { if (!isToday(date)) setDate((d) => shiftDate(d, 1)); }}
          style={[styles.dateArrow, isToday(date) && styles.dateArrowDisabled]}
          hitSlop={8}
        >
          <Icon name="chevron-forward" size={20} color={isToday(date) ? colors.muted : colors.brandPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : data.labourers.length === 0 ? (
        <EmptyState
          title="Koi labour nahi"
          subtitle="Pehle is site ke mazdoor add karein, phir hajari lagayein."
          actionLabel="Labour add karein"
          actionIcon="person-add"
          onAction={() => router.push(`/site/${siteId}/labourers`)}
          testID="empty-attendance"
        />
      ) : (
        <FlatList
          data={data.labourers}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.quickRow}>
              <Text style={styles.quickLabel}>Sabko mark karein:</Text>
              <Pressable testID="all-full" onPress={() => setAll("full")} style={[styles.quickBtn, { backgroundColor: colors.success }]}>
                <Text style={styles.quickBtnText}>All Full</Text>
              </Pressable>
              <Pressable testID="all-absent" onPress={() => setAll("absent")} style={[styles.quickBtn, { backgroundColor: colors.error }]}>
                <Text style={styles.quickBtnText}>All Absent</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`labour-row-${item.id}`}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowWage}>{money(item.daily_wage)}/din</Text>
              </View>
              <SegmentedControl
                testIDPrefix={`att-${item.id}`}
                value={statuses[item.id] ?? "absent"}
                onChange={(s) => setStatus(item.id, s)}
                segments={[
                  { value: "full", label: "Full", activeColor: colors.success, activeTextColor: colors.onSuccess },
                  { value: "half", label: "Half", activeColor: colors.warning, activeTextColor: colors.onWarning },
                  { value: "absent", label: "Absent", activeColor: colors.error, activeTextColor: colors.onError },
                ]}
              />
            </View>
          )}
          ListFooterComponent={<View style={{ height: 8 }} />}
        />
      )}

      {data && data.labourers.length > 0 ? (
        <View style={[styles.sticky, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.sumRow}>
            <Text style={styles.sumText}>{summary.present} present · {money(summary.wage)} aaj</Text>
            {data.uploaded ? (
              <View style={styles.uploadedPill}>
                <Icon name="cloud-done" size={13} color={colors.success} />
                <Text style={styles.uploadedText}>Uploaded</Text>
              </View>
            ) : null}
          </View>
          <Button testID="save-attendance" title="Save & Upload Report" icon="cloud-upload" onPress={onSave} loading={save.isPending} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: fonts.textBold, fontSize: 18, color: colors.onSurface },
  dateBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  dateArrow: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  dateArrowDisabled: { backgroundColor: colors.surfaceTertiary },
  dateCenter: { flex: 1, alignItems: "center" },
  dateText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface },
  todayHint: { fontFamily: fonts.text, fontSize: 11, color: colors.muted, marginTop: 1 },
  list: { padding: spacing.lg, paddingBottom: 150, gap: spacing.md },
  quickRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  quickLabel: { flex: 1, fontFamily: fonts.textMedium, fontSize: 13, color: colors.muted },
  quickBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill },
  quickBtnText: { fontFamily: fonts.textBold, fontSize: 12, color: "#FFFFFF" },
  row: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { flex: 1, fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  rowWage: { fontFamily: fonts.display, fontSize: 13, color: colors.muted },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumText: { fontFamily: fonts.textSemibold, fontSize: 14, color: colors.onSurface },
  uploadedPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  uploadedText: { fontFamily: fonts.textSemibold, fontSize: 12, color: colors.success },
}));
