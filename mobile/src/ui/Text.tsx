import { Text as RNText, type TextProps, StyleSheet } from "react-native";
import { colors, fonts } from "@/theme";

type Weight = "regular" | "medium" | "semibold" | "bold" | "extrabold";

type Props = TextProps & {
  weight?: Weight;
  /** tabular-nums for aligned figures (amounts) */
  tnum?: boolean;
  color?: string;
  size?: number;
};

// Single text primitive that applies the Schibsted Grotesk family for the
// requested weight (custom fonts need an explicit family per weight on RN).
export function Text({
  weight = "regular",
  tnum,
  color = colors.ink,
  size,
  style,
  ...rest
}: Props) {
  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: fonts[weight], color },
        size != null && { fontSize: size },
        tnum && styles.tnum,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  tnum: { fontVariant: ["tabular-nums"] },
});

// Uppercase tracked label used as section eyebrows in the design.
export function Eyebrow({ style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: fonts.semibold,
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: colors.ink3,
        },
        style,
      ]}
    />
  );
}
