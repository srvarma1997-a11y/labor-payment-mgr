import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Switch } from "react-native";
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
import { useBills, useAddBill, useUpdateBill, useDeleteBill } from "@/src/lib/hooks";
import { money, prettyDate, todayStr } from "@/src/lib/format";
import type { Bill } from "@/src/lib/types";

export default function Billing() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const siteId = String(id);

  const { data, isLoading, isError, refetch } = useBills(siteId);
  const addBill = useAddBill(siteId);
  const updBill = useUpdateBill(siteId);
  const delBill = useDeleteBill(siteId);

  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [billNo, setBillNo] = useState("");
  const [amount, setAmount] = useState("");
  const [gst, setGst] = useState(false);
  const [received, setReceived] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");

  const open = (bill?: Bill) => {
    if (bill) {
      setEditing(bill);
      setBillNo(bill.bill_no);
      setAmount(String(bill.amount));
      setGst(bill.gst);
      setReceived(String(bill.payment_received));
      setDate(bill.date);
      setNote(bill.note);
    } else {
      setEditing(null);
      setBillNo("");
      setAmount("");
      setGst(false);
      setReceived("");
      setDate(todayStr());
      setNote("");
    }
    setSheet(true);
  };

  const submit = useCallback(async () => {
    const amt = parseFloat(amount);
    const rec = parseFloat(received) || 0;
    if (!billNo.trim()) return toast.show("Bill number daalein", "error");
    if (!amt || amt <= 0) return toast.show("Bill amount daalein", "error");
    const body = { bill_no: billNo.trim(), amount: amt, gst, payment_received: rec, date, note: note.trim() };
    try {
      if (editing) {
        await updBill.mutateAsync({ id: editing.id, body });
        toast.show("Bill update ho gaya", "success");
      } else {
        await addBill.mutateAsync(body);
        toast.show("Bill add ho gaya", "success");
      }
      setSheet(false);
    } catch {
      toast.show("Save nahi hua", "error");
    }
  }, [billNo, amount, gst, received, date, note, editing, addBill, updBill, toast]);

  const remove = (bill: Bill) =>
    delBill.mutate(bill.id, {
      onSuccess: () => toast.show("Bill hata diya", "success"),
      onError: () => toast.show("Nahi hata", "error"),
    });

  const totals = (data ?? []).reduce(
    (acc, b) => ({ billed: acc.billed + b.amount, received: acc.received + b.payment_received, balance: acc.balance + b.balance }),
    { billed: 0, received: 0, balance: 0 },
  );

  return (
    <View style={styles.root}>
      <AppHeader title="Billing / बिल" back rightIcon="add-circle" onRightPress={() => open()} rightTestID="add-bill-button" />
      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            data.length > 0 ? (
              <Card style={styles.sumCard}>
                <View style={styles.sumCol}>
                  <Text style={styles.sumLabel}>Billed</Text>
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
                  <Text style={[styles.sumValue, { color: totals.balance > 0 ? colors.error : colors.success }]}>{money(totals.balance)}</Text>
                </View>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title="Koi bill nahi"
              subtitle="Is site/company ka pehla bill add karein. GST aur non-GST dono track hote hain."
              actionLabel="Bill add karein"
              actionIcon="add"
              onAction={() => open()}
              testID="empty-bills"
            />
          }
          renderItem={({ item }) => (
            <Pressable testID={`bill-${item.id}`} onPress={() => open(item)}>
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
                  <Text style={styles.billDate}>{prettyDate(item.date)}</Text>
                  <Pressable testID={`del-bill-${item.id}`} onPress={() => remove(item)} hitSlop={8}>
                    <Icon name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
                <View style={styles.billBottom}>
                  <View style={styles.bpCol}>
                    <Text style={styles.bpLabel}>Received</Text>
                    <Text style={[styles.bpValue, { color: colors.success }]}>{money(item.payment_received)}</Text>
                  </View>
                  <View style={styles.bpCol}>
                    <Text style={styles.bpLabel}>Baaki</Text>
                    <Text style={[styles.bpValue, { color: item.balance > 0 ? colors.error : colors.success }]}>{money(item.balance)}</Text>
                  </View>
                </View>
                {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              </Card>
            </Pressable>
          )}
        />
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editing ? "Bill edit" : "Naya Bill"} testID="bill-sheet">
        <Input testID="bill-no" label="Bill number" placeholder="INV-001" value={billNo} onChangeText={setBillNo} />
        <Input testID="bill-amount" label="Bill amount" prefix="₹" placeholder="50000" value={amount} onChangeText={setAmount} keyboardType="numeric" mono />
        <View style={styles.gstRow}>
          <View>
            <Text style={styles.gstRowLabel}>GST Bill</Text>
            <Text style={styles.gstRowSub}>{gst ? "GST ke saath" : "Bina GST ke"}</Text>
          </View>
          <Switch
            testID="bill-gst-toggle"
            value={gst}
            onValueChange={setGst}
            trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Input testID="bill-received" label="Payment received (abhi tak)" prefix="₹" placeholder="0" value={received} onChangeText={setReceived} keyboardType="numeric" mono />
        <Input testID="bill-date" label="Date (YYYY-MM-DD)" placeholder={todayStr()} value={date} onChangeText={setDate} mono />
        <Input testID="bill-note" label="Note (optional)" placeholder="..." value={note} onChangeText={setNote} />
        <Button testID="save-bill" title="Bill save karein" onPress={submit} loading={addBill.isPending || updBill.isPending} icon="checkmark" />
      </Sheet>

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  sumCard: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg },
  sumCol: { flex: 1, alignItems: "center", gap: 2 },
  sumLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  sumValue: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.onSurface },
  sumDivider: { width: 1, height: 32, backgroundColor: colors.border },
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
  billDate: { fontFamily: fonts.text, fontSize: 13, color: colors.muted },
  billBottom: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  bpCol: { flex: 1, gap: 2 },
  bpLabel: { fontFamily: fonts.text, fontSize: 11, color: colors.muted },
  bpValue: { fontFamily: fonts.displayBold, fontSize: 15 },
  note: { fontFamily: fonts.text, fontSize: 13, color: colors.onSurfaceTertiary, fontStyle: "italic" },
  gstRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.lg },
  gstRowLabel: { fontFamily: fonts.textBold, fontSize: 15, color: colors.onSurface },
  gstRowSub: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 1 },
}));
