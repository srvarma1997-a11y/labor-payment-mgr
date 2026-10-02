import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { LoadingView } from "@/src/components/ui/StateViews";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F2F2F7" }}>
        <LoadingView />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (user.role === "owner") return <Redirect href="/(owner)" />;
  return <Redirect href="/(supervisor)" />;
}
