import { useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingView, ErrorView } from "@/src/components/ui/StateViews";
import { useAuth } from "@/src/auth/AuthContext";
import { useSites } from "@/src/lib/hooks";
import type { Site } from "@/src/lib/types";

export default function SupervisorSites() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useSites();

  const renderItem = useCallback(
    ({ item, index }: { item: Site; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
        <Pressable testID={`site-card-${item.id}`} onPress={() => router.push(`/site/${item.id}`)}>
          <Card style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon name="business" size={24} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              {item.company_name ? <Text style={styles.sub} numberOfLines={1}>{item.company_name}</Text> : null}
              {item.location ? (
                <View style={styles.locRow}>
                  <Icon name="location-outline" size={13} color={colors.muted} />
                  <Text style={styles.loc} numberOfLines={1}>{item.location}</Text>
                </View>
              ) : null}
            </View>
            <Icon name="chevron-forward" size={22} color={colors.muted} />
          </Card>
        </Pressable>
      </Animated.View>
    ),
    [router, styles, colors],
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <AppHeader title="My Sites" />
        <LoadingView />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.root}>
        <AppHeader title="My Sites" />
        <ErrorView onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title={`Namaste, ${user?.name?.split(" ")[0] ?? ""}`} subtitle="Aapki sites" />
      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        ListEmptyComponent={
          <EmptyState
            title="Koi site assign nahi"
            subtitle="Aapke thekedar ne abhi tak koi site assign nahi ki. Unse sampark karein."
            testID="empty-sites"
          />
        }
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.textBold, fontSize: 16, color: colors.onSurface },
  sub: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 1 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  loc: { fontFamily: fonts.text, fontSize: 12, color: colors.muted },
}));
