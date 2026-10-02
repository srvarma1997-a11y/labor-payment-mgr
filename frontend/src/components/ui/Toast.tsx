import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, fonts, radius, spacing } from "@/src/theme";
import { Icon, type IoniconName } from "./Icon";

type ToastType = "success" | "error" | "info";
interface ToastData { id: number; message: string; type: ToastType }

const ToastContext = createContext<{ show: (message: string, type?: ToastType) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, type });
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const palette: Record<ToastType, { bg: string; fg: string; icon: IoniconName }> = {
    success: { bg: colors.success, fg: colors.onSuccess, icon: "checkmark-circle" },
    error: { bg: colors.error, fg: colors.onError, icon: "alert-circle" },
    info: { bg: colors.surfaceInverse, fg: colors.onSurfaceInverse, icon: "information-circle" },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOutUp.duration(200)}
          pointerEvents="box-none"
          style={[styles.container, { top: insets.top + spacing.sm }]}
        >
          <Pressable
            testID="toast"
            onPress={() => setToast(null)}
            style={[styles.toast, { backgroundColor: palette[toast.type].bg }]}
          >
            <Icon name={palette[toast.type].icon} size={20} color={palette[toast.type].fg} />
            <Text style={[styles.text, { color: palette[toast.type].fg }]}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 9999, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    maxWidth: 520,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { fontFamily: fonts.textSemibold, fontSize: 14, flexShrink: 1 },
});
