import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
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
import { useSupervisors, useAddSupervisor, useDeleteSupervisor, useSites } from "@/src/lib/hooks";
import type { User, Site } from "@/src/lib/types";

export default function Team() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { data: sups, isLoading, isError, refetch, isRefetching } = useSupervisors();
  const { data: sites } = useSites();
  const addSup = useAddSupervisor();
  const delSup = useDeleteSupervisor();

  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSite = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = useCallback(async () => {
    if (!name.trim() || !phone.trim() || !password) return toast.show("Saari details bharein", "error");
    if (password.length < 4) return toast.show("Password kam se kam 4 akshar", "error");
    try {
      await addSup.mutateAsync({ name: name.trim(), phone: phone.trim(), password, site_ids: selected });
      toast.show("Supervisor add ho gaya", "success");
      setSheet(false);
      setName("");
      setPhone("");
      setPassword("");
      setSelected([]);
    } catch (e: any) {
      toast.show(e?.message ?? "Add nahi hua", "error");
    }
  }, [name, phone, password, selected, addSup, toast]);

  const remove = (s: User) => {
    delSup.mutate(s.id, {
      onSuccess: () => toast.show("Supervisor hata diya", "success"),
      onError: () => toast.show("Nahi hata", "error"),
    });
  };

  const siteName = (id: string) => sites?.find((x) => x.id === id)?.name ?? "Site";

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
          </View>
          <Pressable testID={`remove-sup-${item.id}`} onPress={() => remove(item)} hitSlop={8} style={styles.trash}>
            <Icon name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
        <View style={styles.chipsWrap}>
          {item.site_ids.length === 0 ? (
            <Text style={styles.noSite}>Koi site assign nahi</Text>
          ) : (
            item.site_ids.map((sid) => (
              <View key={sid} style={styles.chip}>
                <Icon name="business" size={12} color={colors.onBrandTertiary} />
                <Text style={styles.chipText}>{siteName(sid)}</Text>
              </View>
            ))
          )}
        </View>
      </Card>
    ),
    [styles, colors, sites],
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader title="Team" />
        <LoadingView />
      </View>
    );
  }
  if (isError || !sups) {
    return (
      <View style={styles.root}>
        <AppHeader title="Team" />
        <ErrorView onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader
        title="Supervisors"
        subtitle={`${sups.length} log`}
        rightIcon="person-add"
        onRightPress={() => setSheet(true)}
        rightTestID="add-supervisor-button"
      />
      <FlatList
        data={sups}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        ListEmptyComponent={
          <EmptyState
            title="Koi supervisor nahi"
            subtitle="Har site ka supervisor add karein. Woh roz hajari aur report upload karega."
            actionLabel="Supervisor add karein"
            actionIcon="person-add"
            onAction={() => setSheet(true)}
            testID="empty-supervisors"
          />
        }
      />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Naya Supervisor" testID="supervisor-sheet">
        <Input testID="sup-name" label="Naam" placeholder="Suresh" value={name} onChangeText={setName} />
        <Input testID="sup-phone" label="Phone (login ke liye)" placeholder="9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" mono />
        <Input testID="sup-password" label="Password" placeholder="Set a password" value={password} onChangeText={setPassword} secureTextEntry />
        <View style={styles.assignBlock}>
          <Text style={styles.assignLabel}>Sites assign karein</Text>
          <View style={styles.chipsWrap}>
            {(sites ?? []).map((s: Site) => {
              const on = selected.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  testID={`assign-site-${s.id}`}
                  onPress={() => toggleSite(s.id)}
                  style={[styles.selectChip, on && styles.selectChipOn]}
                >
                  <Icon name={on ? "checkmark-circle" : "ellipse-outline"} size={16} color={on ? colors.onBrandPrimary : colors.muted} />
                  <Text style={[styles.selectChipText, on && styles.selectChipTextOn]}>{s.name}</Text>
                </Pressable>
              );
            })}
            {(sites ?? []).length === 0 ? <Text style={styles.noSite}>Pehle site add karein</Text> : null}
          </View>
        </View>
        <Button testID="save-supervisor" title="Supervisor save karein" onPress={submit} loading={addSup.isPending} icon="checkmark" />
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  card: { gap: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onBrandSecondary },
  name: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  phone: { fontFamily: fonts.display, fontSize: 13, color: colors.muted, marginTop: 1 },
  trash: { padding: spacing.xs },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.textSemibold, fontSize: 12, color: colors.onBrandTertiary },
  noSite: { fontFamily: fonts.text, fontSize: 13, color: colors.muted },
  assignBlock: { gap: spacing.sm },
  assignLabel: { fontFamily: fonts.textSemibold, fontSize: 14, color: colors.onSurfaceTertiary },
  selectChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  selectChipOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  selectChipText: { fontFamily: fonts.textSemibold, fontSize: 13, color: colors.onSurfaceTertiary },
  selectChipTextOn: { color: colors.onBrandPrimary },
}));
