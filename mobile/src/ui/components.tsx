import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewProps,
} from "react-native";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { colors, radius } from "@/theme";

// White rounded card with hairline border — the workhorse container.
export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

// Black pill button used for primary actions ("Scan", "Save expense").
export function PrimaryButton({
  label,
  icon,
  loading,
  style,
  disabled,
  ...rest
}: PressableProps & {
  label: string;
  icon?: IconName;
  loading?: boolean;
}) {
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
        style as object,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accentInk} />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color={colors.accentInk} sw={2.2} />}
          <Text weight="semibold" color={colors.accentInk} size={17}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Circular hairline icon button (header actions).
export function IconButton({
  name,
  onPress,
  size = 38,
  iconColor = colors.ink,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size },
        pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Icon name={name} size={size * 0.5} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  iconBtn: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
    alignItems: "center",
    justifyContent: "center",
  },
});
