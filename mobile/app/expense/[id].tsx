import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { receiptImageSource } from "@/api/client";
import { formatDate, money } from "@/lib/format";
import { useDeleteExpense, useExpense } from "@/lib/queries";
import { categoryMeta, colors } from "@/theme";
import { Card } from "@/ui/components";
import { CatIcon } from "@/ui/CatIcon";
import { Icon, type IconName } from "@/ui/Icon";
import { Eyebrow, Text } from "@/ui/Text";

type ImageSource = { uri: string; headers: Record<string, string> };

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useExpense(id);
  const del = useDeleteExpense();
  const [img, setImg] = useState<ImageSource | null>(null);

  useEffect(() => {
    if (data?.receiptKey) receiptImageSource(data.receiptKey).then(setImg);
  }, [data?.receiptKey]);

  function confirmDelete() {
    Alert.alert("Delete expense?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await del.mutateAsync(id);
          router.back();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text color={colors.ink3}>Could not load this expense.</Text>
      </View>
    );
  }

  const meta = categoryMeta(data.category);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <HdrBtn name="chevL" onPress={() => router.back()} />
        <HdrBtn name="trash" onPress={confirmDelete} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* hero */}
        <View style={styles.hero}>
          <CatIcon category={data.category} size={64} />
          <Text weight="bold" size={21} style={{ marginTop: 16, letterSpacing: -0.4 }}>
            {data.merchant || "Unknown merchant"}
          </Text>
          <Text weight="bold" size={48} tnum style={{ marginTop: 6, letterSpacing: -1.9 }}>
            {money(data.total)}
          </Text>
          <View style={styles.catPill}>
            <View style={[styles.dot, { backgroundColor: meta.color }]} />
            <Text weight="semibold" size={13}>
              {data.category}
            </Text>
          </View>
        </View>

        {/* meta */}
        <Card style={styles.metaCard}>
          <DetRow icon="calendar" label="Date" value={formatDate(data.purchasedAt)} />
          <DetRow icon="card" label="Currency" value={data.currency} />
          {data.tax > 0 && <DetRow icon="note" label="Tax" value={money(data.tax)} />}
          {data.notes ? <DetRow icon="note" label="Notes" value={data.notes} last /> : null}
        </Card>

        {/* itemised */}
        {data.lineItems.length > 0 && (
          <Card style={styles.itemsCard}>
            <Text weight="bold" size={14} style={{ marginBottom: 12 }}>
              Itemised
            </Text>
            {data.lineItems.map((li, i) => (
              <View key={i} style={styles.itemRow}>
                <Text size={14.5} color={colors.ink2} numberOfLines={1} style={{ flex: 1 }}>
                  {li.qty > 1 ? `${li.qty}× ` : ""}
                  {li.name || "Item"}
                </Text>
                <Text size={14.5} tnum>
                  {money(li.unitPrice)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* receipt */}
        {img && (
          <>
            <Eyebrow style={{ paddingHorizontal: 4, paddingBottom: 10 }}>Receipt</Eyebrow>
            <View style={styles.receiptCard}>
              <Image source={img} style={styles.receiptImg} contentFit="contain" />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HdrBtn({ name, onPress }: { name: IconName; onPress: () => void }) {
  return (
    <Pressable style={styles.hdrBtn} onPress={onPress}>
      <Icon name={name} size={18} color={colors.ink} />
    </Pressable>
  );
}

function DetRow({
  icon,
  label,
  value,
  last,
}: {
  icon: IconName;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detRow, !last && styles.detDivider]}>
      <Icon name={icon} size={19} color={colors.ink3} />
      <Text size={14.5} color={colors.ink3} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text weight="semibold" size={14.5}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  hdrBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { alignItems: "center", paddingTop: 14, paddingBottom: 26 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaCard: { paddingHorizontal: 16, marginBottom: 12 },
  detRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 54 },
  detDivider: { borderBottomWidth: 1, borderBottomColor: colors.hair2 },
  itemsCard: { padding: 16, marginBottom: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  receiptCard: {
    backgroundColor: colors.hair2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: 16,
    alignItems: "center",
  },
  receiptImg: { width: "100%", height: 360, borderRadius: 8 },
});
