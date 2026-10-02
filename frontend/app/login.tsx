import { useRef, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { makeStyles, useTheme, fonts, radius, spacing } from "@/src/theme";
import { useAuth } from "@/src/auth/AuthContext";
import { useToast } from "@/src/components/ui/Toast";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";
import { ApiError } from "@/src/lib/api";

const HERO =
  "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Login() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, registerOwner } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const submit = async () => {
    if (!phone.trim() || !password) {
      toast.show("Phone aur password daalein", "error");
      return;
    }
    if (mode === "register" && !name.trim()) {
      toast.show("Apna naam daalein", "error");
      return;
    }
    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await login(phone.trim(), password)
          : await registerOwner(name.trim(), phone.trim(), password);
      toast.show("Welcome, " + user.name, "success");
      router.replace(user.role === "owner" ? "/(owner)" : "/(supervisor)");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Kuch galat ho gaya";
      toast.show(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" />
        <LinearGradient
          colors={["rgba(28,28,30,0.2)", "rgba(28,28,30,0.95)"]}
          style={styles.scrim}
        />
        <View style={[styles.heroText, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Icon name="business" size={24} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.brandName}>SiteHisab</Text>
          </View>
          <Text style={styles.tagline}>साइट हिसाब · Labour & Billing</Text>
          <Text style={styles.subTagline}>
            Har site ka hisaab — hajari, payment aur bill, ek jagah.
          </Text>
        </View>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.toggle}>
          <Pressable
            testID="mode-login"
            style={[styles.toggleBtn, mode === "login" && styles.toggleActive]}
            onPress={() => setMode("login")}
          >
            <Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            testID="mode-register"
            style={[styles.toggleBtn, mode === "register" && styles.toggleActive]}
            onPress={() => setMode("register")}
          >
            <Text style={[styles.toggleText, mode === "register" && styles.toggleTextActive]}>
              New Owner
            </Text>
          </Pressable>
        </View>

        {mode === "register" ? (
          <Input
            testID="input-name"
            label="Aapka naam / Your name"
            placeholder="Ramesh Contractor"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
        ) : null}

        <Input
          ref={phoneRef}
          testID="input-phone"
          label="Phone number"
          placeholder="9876543210"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          mono
          returnKeyType="next"
          onSubmitEditing={() => passRef.current?.focus()}
        />
        <Input
          ref={passRef}
          testID="input-password"
          label="Password"
          placeholder="••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <Button
          testID="submit-auth"
          title={mode === "login" ? "Login" : "Account banayein"}
          onPress={submit}
          loading={busy}
          icon={mode === "login" ? "log-in-outline" : "person-add-outline"}
        />

        <View style={styles.hint}>
          <Icon name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={styles.hintText}>
            {mode === "login"
              ? "Supervisor? Thekedar dwara diye gaye phone aur password se login karein."
              : "Owner (thekedar) ke liye. Supervisor account owner banayega."}
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280 },
  heroImg: { ...abs() },
  scrim: { ...abs() },
  heroText: { flex: 1, justifyContent: "flex-end", padding: spacing.xl, gap: spacing.xs },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontFamily: fonts.displayBold, fontSize: 30, color: "#FFFFFF" },
  tagline: { fontFamily: fonts.textSemibold, fontSize: 15, color: "#FFFFFF" },
  subTagline: { fontFamily: fonts.text, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 18 },
  form: {
    padding: spacing.xl,
    gap: spacing.lg,
    marginTop: -spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  toggleBtn: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.sm + 2 },
  toggleActive: { backgroundColor: colors.surfaceSecondary },
  toggleText: { fontFamily: fonts.textSemibold, fontSize: 15, color: colors.muted },
  toggleTextActive: { color: colors.onSurface },
  hint: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontFamily: fonts.text, fontSize: 12, color: colors.muted, lineHeight: 17 },
}));

function abs() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}
