import Ionicons from "@react-native-vector-icons/ionicons";
import { useTheme } from "@/src/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IoniconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.onSurface} />;
}

export type { IoniconName };
