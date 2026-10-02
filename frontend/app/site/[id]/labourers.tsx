import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Icon } from "@/src/components/ui/Icon";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Sheet } from "@/src/components/ui/Sheet";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useToast } from "@/src/components/ui/Toast";
import { useLabourers, useAddLabourer, useUpdateLabourer, useDeleteLabourer } from "@/src/lib/hooks";
import { money } from "@/src/lib/format";
import type { Labourer } from "@/src/lib/types";

export default function Labourers() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const siteId = String(id);

  const { data, isLoading, isError, refetch } = useLabourers(siteId);
  const addLab = useAddLabourer(siteId);
  const updLab = useUpdateLabourer(siteId);
  const delLab = useDeleteLabourer(siteId);

  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<Labourer | null>(null);
  const [name, setName] = useState("");
  const [wage, setWage] = useState("");
  const [phone, setPhone] = useState("");

  const open = (lab?: Labourer) => {
    if (lab) {
      setEditing(lab);
      setName(lab.name);
      setWage(String(lab.daily_wage));
      setPhone(lab.phone);
    } else {
      setEditing(null);
      setName("");
      setWage("");
      setPhone("");
    }
    setSheet(true);
  };

  const submit = useCallback(async () => {
    const wageNum = parseFloat(wage);
    if (!name.trim()) return toast.show("Naam daalein", "error");
    if (!wageNum || wageNum <= 0) return toast.show("Sahi dihadi daalein", "error");
    try {
      if (editing) {
        await updLab.mutateAsync({ id: editing.id, body: { name: name.trim(), daily_wage: wageNum, phone: phone.trim() } });
        toast.show("Update ho gaya", "success");
      } else {
        await addLab.mutateAsync({ name: name.trim(), daily_wage: wageNum, phone: phone.trim() });
        toast.show("Labour add ho gaya", "success");
      }
      setSheet(false);
    } catch {
      toast.show("Save nahi hua", "error");
    }
  }, [name, wage, phone, editing, addLab, updLab, toast]);

  const remove = (lab: Labourer) =>
    delLab.mutate(lab.id, {
      onSuccess: () => toast.show("Labour hata diya", "success"),
      onError: () => toast.show("Nahi hata", "error"),
    });

  return (
    <View style={styles.root}>
      <AppHeader title="Labour / मज़दूर" back rightIcon="person-add" onRightPress={() => open()} rightTestID="add-labour-button" />
      {isLoading ? (
        <LoadingView />
      ) : isError || !data ? (
        <ErrorView onRetry={refetch} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="Koi labour nahi"
              subtitle="Is site ke mazdoor unke naam aur dihadi (daily wage) ke saath add karein."
              actionLabel="Labour add karein"
              actionIcon="person-add"
              onAction={() => open()}
              testID="empty-labour"
            />
          }
          renderItem={({ item }) => (
            <Pressable testID={`labour-${item.id}`} onPress={() => open(item)} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
              </View>
              <View style={styles.wageWrap}>
                <Text style={styles.wage}>{money(item.daily_wage)}</Text>
                <Text style={styles.wageLabel}>per din</Text>
              </View>
              <Pressable testID={`del-labour-${item.id}`} onPress={() => remove(item)} hitSlop={8} style={styles.trash}>
                <Icon name="trash-outline" size={19} color={colors.error} />
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editing ? "Labour edit" : "Naya Labour"} testID="labour-sheet">
        <Input testID="lab-name" label="Naam" placeholder="Ramu" value={name} onChangeText={setName} />
        <Input testID="lab-wage" label="Dihadi / Daily wage" prefix="₹" placeholder="600" value={wage} onChangeText={setWage} keyboardType="numeric" mono />
        <Input testID="lab-phone" label="Phone (optional)" placeholder="9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" mono />
        <Button testID="save-labour" title="Save karein" onPress={submit} loading={addLab.isPending || updLab.isPending} icon="checkmark" />
      </Sheet>

      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  list: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onBrandTertiary },
  name: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  phone: { fontFamily: fonts.display, fontSize: 12, color: colors.muted, marginTop: 1 },
  wageWrap: { alignItems: "flex-end" },
  wage: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.brandPrimary },
  wageLabel: { fontFamily: fonts.text, fontSize: 10, color: colors.muted },
  trash: { padding: spacing.xs, marginLeft: spacing.xs },
}));
