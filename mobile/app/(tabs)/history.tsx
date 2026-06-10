import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Expense } from "@/api/types";
import { dayGroupLabel, formatMonthLabel, money } from "@/lib/format";
import { useCategories, useExpenses } from "@/lib/queries";
import { colors, radius } from "@/theme";
import { Card, IconButton } from "@/ui/components";
import { Icon } from "@/ui/Icon";
import { Text } from "@/ui/Text";
import { TxnRow } from "@/ui/TxnRow";

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);

  const { data: categories } = useCategories();
  const { data, isLoading, isError } = useExpenses({
    q: search.trim() || undefined,
    category,
  });

  // Group the (date-sorted) expenses by purchase day.
  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of data?.expenses ?? []) {
      const arr = map.get(e.purchasedAt) ?? [];
      arr.push(e);
      map.set(e.purchasedAt, arr);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, items]) => ({
        day,
        items,
        subtotal: items.reduce((s, t) => s + t.total, 0),
      }));
  }, [data]);

  const count = data?.expenses.length ?? 0;
  const chips = [{ id: "all", name: "All" }, ...(categories ?? [])];

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* title + search */}
      <View style={{ paddingHorizontal: 18 }}>
        <View style={styles.titleRow}>
          <Text weight="bold" size={30} style={{ letterSpacing: -0.9 }}>
            History
          </Text>
        </View>
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color={colors.ink3} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant"
            placeholderTextColor={colors.ink3}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {chips.map((c) => {
          const on = c.id === "all" ? !category : category === c.name;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id === "all" ? undefined : c.name)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text
                weight="semibold"
                size={13.5}
                color={on ? colors.accentInk : colors.ink2}
              >
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* month summary */}
      <View style={styles.summaryLine}>
        <Text size={13} color={colors.ink3}>
          {formatMonthLabel(new Date().toISOString().slice(0, 7))} · {count} expense
          {count === 1 ? "" : "s"}
        </Text>
      </View>

      {/* groups */}
      <View style={{ paddingHorizontal: 18 }}>
        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : isError ? (
          <Text color={colors.ink3} style={styles.empty}>
            Couldn't load expenses. Check Settings.
          </Text>
        ) : groups.length === 0 ? (
          <Text color={colors.ink3} style={styles.empty}>
            No expenses{category ? ` in ${category}` : ""} yet.
          </Text>
        ) : (
          groups.map((g) => (
            <View key={g.day} style={{ marginBottom: 18 }}>
              <View style={styles.groupHead}>
                <Text weight="bold" size={13} color={colors.ink2}>
                  {dayGroupLabel(g.day)}
                </Text>
                <Text size={12.5} color={colors.ink3} tnum>
                  {money(g.subtotal)}
                </Text>
              </View>
              <Card style={{ overflow: "hidden" }}>
                {g.items.map((t, i) => (
                  <TxnRow
                    key={t.id}
                    expense={t}
                    last={i === g.items.length - 1}
                    onPress={() => router.push(`/expense/${t.id}`)}
                  />
                ))}
              </Card>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 16,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: "SchibstedGrotesk_500Medium",
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  chips: { gap: 8, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  summaryLine: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 10 },
  groupHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 4,
    paddingBottom: 9,
  },
  empty: { textAlign: "center", paddingVertical: 60, fontSize: 15 },
});
