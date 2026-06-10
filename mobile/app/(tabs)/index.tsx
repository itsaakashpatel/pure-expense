import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Summary } from "@/api/types";
import {
  currentMonth,
  formatDate,
  formatMonthLabel,
  money,
} from "@/lib/format";
import { loadSettings } from "@/lib/settings";
import { useExpenses, useSummary, useTrends } from "@/lib/queries";
import { categoryMeta, colors } from "@/theme";
import { CatIcon } from "@/ui/CatIcon";
import { Card, IconButton } from "@/ui/components";
import { Icon } from "@/ui/Icon";
import { Eyebrow, Text } from "@/ui/Text";
import { TxnRow } from "@/ui/TxnRow";

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const month = currentMonth();
  const [budget, setBudget] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        if (!s.baseUrl || !s.token) router.replace("/onboarding");
        else setBudget(s.budget);
      });
    }, [router]),
  );

  const summary = useSummary(month);
  const trends = useTrends(6);
  const recent = useExpenses({ limit: 4 });

  return (
    <ScrollView
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* header */}
      <View style={styles.header}>
        <View style={styles.monthChip}>
          <Text weight="bold" size={21} style={{ letterSpacing: -0.4 }}>
            {formatMonthLabel(month)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton name="bell" onPress={() => router.push("/settings")} />
          <IconButton name="settings" onPress={() => router.push("/settings")} />
        </View>
      </View>

      {summary.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : summary.isError ? (
        <Card style={styles.errCard}>
          <Text color={colors.ink2}>Couldn't load this month. Pull to retry or check Settings.</Text>
        </Card>
      ) : (
        <TotalCard data={summary.data!} budget={budget} />
      )}

      {/* monthly chart */}
      <Card style={styles.chartCard}>
        <View style={styles.cardHead}>
          <Text weight="bold" size={16}>
            Monthly spending
          </Text>
          <Text size={12.5} color={colors.ink3}>
            Last 6 months
          </Text>
        </View>
        {trends.data && <BarChart series={trends.data.months} />}
      </Card>

      {/* breakdown */}
      {summary.data && summary.data.byCategory.length > 0 && (
        <Card style={styles.breakCard}>
          <Text weight="bold" size={16} style={{ marginBottom: 18 }}>
            Where it went
          </Text>
          {summary.data.byCategory.map((b) => {
            const pct = summary.data!.total ? (b.total / summary.data!.total) * 100 : 0;
            return (
              <View key={b.category} style={styles.breakRow}>
                <CategoryBar category={b.category} amount={b.total} pct={pct} />
              </View>
            );
          })}
        </Card>
      )}

      {/* recent */}
      <View style={styles.recentHead}>
        <Text weight="bold" size={16}>
          Recent
        </Text>
        <Text weight="semibold" size={14} color={colors.ink2} onPress={() => router.push("/history")}>
          See all
        </Text>
      </View>
      {recent.data && recent.data.expenses.length > 0 ? (
        <Card style={{ overflow: "hidden" }}>
          {recent.data.expenses.map((t, i, arr) => (
            <TxnRow
              key={t.id}
              expense={t}
              last={i === arr.length - 1}
              onPress={() => router.push(`/expense/${t.id}`)}
            />
          ))}
        </Card>
      ) : (
        <Card style={styles.errCard}>
          <Text color={colors.ink3}>No expenses yet. Tap scan to add your first.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function TotalCard({ data, budget }: { data: Summary; budget: number }) {
  const prev = data.previousMonthTotal;
  const delta = prev > 0 ? ((data.total - prev) / prev) * 100 : 0;
  const up = data.total >= prev;
  const budgetPct = budget > 0 ? Math.min(100, (data.total / budget) * 100) : 0;

  return (
    <Card style={styles.totalCard}>
      <Eyebrow>Total spent</Eyebrow>
      <View style={styles.totalRow}>
        <Text weight="bold" size={46} tnum style={{ letterSpacing: -1.6, lineHeight: 50 }}>
          {money(data.total)}
        </Text>
        <View style={styles.ccyPill}>
          <Text weight="semibold" size={13} color={colors.ink3}>
            CAD
          </Text>
        </View>
      </View>
      {prev > 0 && (
        <View style={styles.deltaRow}>
          <Icon name={up ? "arrowUp" : "arrowDown"} size={15} color={colors.ink2} sw={2.2} />
          <Text weight="semibold" size={13.5} color={colors.ink2}>
            {Math.abs(delta).toFixed(1)}%
          </Text>
          <Text size={13.5} color={colors.ink3}>
            vs. {money(prev, { decimals: false })} last month
          </Text>
        </View>
      )}
      {budget > 0 && (
        <View style={{ marginTop: 18 }}>
          <View style={styles.budgetLabel}>
            <Text weight="semibold" size={12.5} color={colors.ink2}>
              Budget
            </Text>
            <Text size={12.5} color={colors.ink3} tnum>
              {money(data.total, { decimals: false })} of {money(budget, { decimals: false })}
            </Text>
          </View>
          <Track pct={budgetPct} color={colors.accent} height={7} />
        </View>
      )}
    </Card>
  );
}

function BarChart({ series }: { series: { month: string; total: number }[] }) {
  const max = Math.max(1, ...series.map((m) => m.total));
  return (
    <View style={styles.chart}>
      {series.map((m, i) => {
        const cur = i === series.length - 1;
        const h = Math.round((m.total / max) * 116) + 4;
        return (
          <View key={m.month} style={styles.barCol}>
            <Text weight="semibold" size={10.5} tnum color={cur ? colors.ink : "transparent"}>
              {(m.total / 100000).toFixed(1)}k
            </Text>
            <View
              style={{
                width: "100%",
                maxWidth: 30,
                height: h,
                borderRadius: 8,
                backgroundColor: cur ? colors.accent : colors.hair,
              }}
            />
            <Text
              weight={cur ? "bold" : "medium"}
              size={11.5}
              color={cur ? colors.ink : colors.ink3}
            >
              {formatDate(`${m.month}-01`, "MMM")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function CategoryBar({
  category,
  amount,
  pct,
}: {
  category: string;
  amount: number;
  pct: number;
}) {
  const meta = categoryMeta(category);
  return (
    <>
      <View style={{ marginRight: 13 }}>
        <CatIcon category={category} size={36} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.breakLabel}>
          <Text weight="semibold" size={14.5} numberOfLines={1} style={{ flex: 1 }}>
            {category}
          </Text>
          <Text weight="semibold" size={14.5} tnum>
            {money(amount)}
          </Text>
        </View>
        <Track pct={pct} color={meta.color} height={5} />
      </View>
      <Text size={12} color={colors.ink3} tnum style={{ width: 32, textAlign: "right" }}>
        {pct.toFixed(0)}%
      </Text>
    </>
  );
}

function Track({ pct, color, height }: { pct: number; color: string; height: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View style={{ height, width: `${pct}%`, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  monthChip: { flexDirection: "row", alignItems: "center", gap: 7 },
  loading: { paddingVertical: 60, alignItems: "center" },
  errCard: { padding: 18 },
  totalCard: { padding: 22, marginBottom: 14 },
  totalRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 10 },
  ccyPill: {
    marginBottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: 7,
  },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  budgetLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  track: { width: "100%", backgroundColor: colors.hair, overflow: "hidden" },
  chartCard: { padding: 20, marginBottom: 14 },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 18,
  },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, height: 150 },
  barCol: { flex: 1, alignItems: "center", gap: 8 },
  breakCard: { padding: 20, paddingBottom: 4, marginBottom: 14 },
  breakRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  breakLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7, gap: 8 },
  recentHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
});
