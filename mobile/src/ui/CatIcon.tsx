import { View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { categoryMeta, colors } from "@/theme";

// Rounded category tile: colored square (mono ramp) with a white glyph.
export function CatIcon({
  category,
  size = 40,
  color,
}: {
  category: string;
  size?: number;
  color?: string;
}) {
  const meta = categoryMeta(category);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: color ?? meta.color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={meta.glyph as IconName} size={size * 0.55} color={colors.surface} sw={1.7} />
    </View>
  );
}
