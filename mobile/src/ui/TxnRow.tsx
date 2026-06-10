import { Pressable, StyleSheet, View } from "react-native";
import { CatIcon } from "./CatIcon";
import { Text } from "./Text";
import type { Expense } from "@/api/types";
import { money } from "@/lib/format";
import { colors } from "@/theme";

// One expense row inside a card list (dashboard "Recent" + history groups).
export function TxnRow({
  expense,
  onPress,
  last,
}: {
  expense: Expense;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.divider,
        pressed && { backgroundColor: colors.hair2 },
      ]}
    >
      <CatIcon category={expense.category} size={40} />
      <View style={styles.main}>
        <Text weight="semibold" size={15.5} numberOfLines={1}>
          {expense.merchant || "Unknown merchant"}
        </Text>
        <Text size={13} color={colors.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
          {expense.category}
        </Text>
      </View>
      <Text weight="semibold" size={15.5} tnum>
        {money(expense.total)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hair2 },
  main: { flex: 1, minWidth: 0 },
});
