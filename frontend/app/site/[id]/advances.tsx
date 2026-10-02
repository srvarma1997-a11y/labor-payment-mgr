import { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
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
import { useAdvances, useAddAdvance, useDeleteAdvance, useLabourers } from "@/src/lib/hooks";
import { money, prettyDate, todayStr } from "@/src/lib/format";
import type { Advance } from "@/src/lib/types";

export default function Advances() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const siteId = String(id);

  const { data, isLoading, isError, refetch } = useAdvances(siteId);
  const { data: labs } = useLabourers(siteId);
  const addAdv = useAddAdvance(siteId);
  const delAdv = useDeleteAdvance(siteId);

  const [sheet, setSheet] = useState(false);
  const [labourerId, setLabourerId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");

  const labName = useMemo(() => {
    const m: Record<string, string> = {};
    (labs ?? []).forEach((l) => (m[l.id] = l.name));
    return m;
  }, [labs]);

  const open = () => {
    setLabourerId(labs && labs.length ? labs[0].id : "");
    setAmount("");
    setDate(todayStr());
    setNote("");
    setSheet(true);
  };

  const submit = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!labourerId) return toast.show("Labour chunein", "error");
    if (!amt || amt <= 0) return toast.show("Amount daalein", "error");
    try {
      await addAdv.mutateAsync({ labourer_id: labourerId, amount: amt, date, note: note.trim() });
      toast.show("Advance add ho gaya", "success");
      setSheet(false);
    } catch {
      toast.show("Save nahi hua", "error");
    }
  }, [labourerId, amount, date, note, addAdv, toast]);

  const remove = (adv: Advance) =>
    delAdv.mutate(adv.id, {
      onSuccess: () => toast.show("Advance hata diya", "success"),
      onError: () => toast.show("Nahi hata", "error"),
    });

  const total = (data ?? []).reduce((a, b) => a + b.amount, 0);

  return (
    <View style={styles.root}>
      <AppHeader title="Advance / एडवांस" back rightIcon="add-circle" onRightPress={open} rightTestID="add-advance-button" />
      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            data.length > 0 ? (
              <Card style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Advance diya</Text>
                <Text style={styles.totalValue}>{money(total)}</Text>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="Koi advance nahi"
              subtitle="Kisi mazdoor ko diya gaya advance yahan add karein. Month-end payment me yeh minus ho jayega."
              actionLabel="Advance add karein"
              actionIcon="add"
              onAction={open}
              testID="empty-advances"
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.avatar}>
                <Icon name="wallet" size={20} color={colors.onBrandTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{labName[item.labourer_id] ?? "Labour"}</Text>
                <Text style={styles.date}>{prettyDate(item.date)}{item.note ? ` · ${item.note}` : ""}</Text>
              </View>
              <Text style={styles.amount}>{money(item.amount)}</Text>
              <Pressable testID={`del-advance-${item.id}`} onPress={() => remove(item)} hitSlop={8} style={styles.trash}>
                <Icon name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </Card>
          )}
        />
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Naya Advance" testID="advance-sheet">
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.pickLabel}>Labour chunein</Text>
          {labs && labs.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {labs.map((l) => {
                const on = l.id === labourerId;
                return (
                  <Pressable key={l.id} testID={`pick-labour-${l.id}`} onPress={() => setLabourerId(l.id)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{l.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.noLab}>Pehle labour add karein</Text>
          )}
        </View>
        <Input testID="advance-amount" label="Amount" prefix="₹" placeholder="1000" value={amount} onChangeText={setAmount} keyboardType="numeric" mono />
        <Input testID="advance-date" label="Date (YYYY-MM-DD)" placeholder={todayStr()} value={date} onChangeText={setDate} mono />
        <Input testID="advance-note" label="Note (optional)" placeholder="..." value={note} onChangeText={setNote} />
        <Button testID="save-advance" title="Advance save karein" onPress={submit} loading={addAdv.isPending} icon="checkmark" />
      </Sheet>

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.sm },
  totalCard: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary, alignItems: "center", gap: 2, marginBottom: spacing.xs },
  totalLabel: { fontFamily: fonts.textSemibold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  totalValue: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.onBrandPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  date: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 1 },
  amount: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.warning === "#FFCC00" ? colors.onSurface : colors.onSurface },
  trash: { padding: spacing.xs },
  pickLabel: { fontFamily: fonts.textSemibold, fontSize: 14, color: colors.onSurfaceTertiary },
  chipRow: { gap: spacing.sm, paddingVertical: 2 },
  chip: { flexShrink: 0, paddingHorizontal: spacing.lg, minHeight: 36, justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.textSemibold, fontSize: 14, color: colors.onSurfaceTertiary },
  chipTextOn: { color: colors.onBrandPrimary },
  noLab: { fontFamily: fonts.text, fontSize: 13, color: colors.muted },
}));
