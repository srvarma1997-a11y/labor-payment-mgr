import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme, fonts } from "@/src/theme";
import { usesNativeTabs } from "@/src/navigation";
import { Icon } from "@/src/components/ui/Icon";

export default function OwnerLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="house.fill" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="billing">
          <NativeTabs.Trigger.Icon sf="receipt.fill" />
          <NativeTabs.Trigger.Label>Bills</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" />
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.textSemibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color }) => <Icon name="home" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="billing"
        options={{ title: "All Bills", tabBarIcon: ({ color }) => <Icon name="receipt" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarIcon: ({ color }) => <Icon name="person-circle" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="team"
        options={{ href: null }}
      />
    </Tabs>
  );
}
