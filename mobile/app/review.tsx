import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api/client";
import type { ExpenseInput } from "@/api/types";
import { takeDraft } from "@/lib/draft";
import { money, parseMoneyToCents } from "@/lib/format";
import { useCategories, useCreateExpense } from "@/lib/queries";
import { categoryMeta, colors, radius } from "@/theme";
import { Card, PrimaryButton } from "@/ui/components";
import { Icon, type IconName } from "@/ui/Icon";
import { Eyebrow, Text } from "@/ui/Text";

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useMemo(() => takeDraft(), []);
  const { data: categories } = useCategories();
  const createExpense = useCreateExpense();
  const [saving, setSaving] = useState(false);
  const [showItems, setShowItems] = useState(true);

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("Shopping");

  useEffect(() => {
    if (!draft) return;
    setMerchant(draft.parsed.merchant);
    setAmount((draft.parsed.total / 100).toFixed(2));
    setDate(draft.parsed.purchasedAt);
    setCategory(draft.parsed.category || "Shopping");
  }, [draft]);

  if (!draft) {
    return (
      <View style={styles.fallback}>
        <Text color={colors.ink2}>Nothing to review.</Text>
        <PrimaryButton label="Back" onPress={() => router.replace("/")} style={{ paddingHorizontal: 28 }} />
      </View>
    );
  }

  const items = draft.parsed.lineItems;
  const itemsSum = items.reduce((s, li) => s + li.unitPrice * (li.qty || 1), 0);

  async function save() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid date", "Use the format YYYY-MM-DD.");
      return;
    }
    setSaving(true);
    try {
      let receiptKey: string | null = null;
      if (draft!.imageUri) receiptKey = await api.uploadReceipt(draft!.imageUri);
      const input: ExpenseInput = {
        merchant: merchant.trim(),
        total: parseMoneyToCents(amount),
        tax: draft!.parsed.tax,
        currency: draft!.parsed.currency || "CAD",
        category,
        purchasedAt: date,
        notes: notes.trim(),
        receiptKey,
        rawText: draft!.rawText,
        lineItems: items,
      };
      await createExpense.mutateAsync(input);
      router.replace("/");
    } catch (e) {
      Alert.alert("Couldn't save", String((e as Error).message ?? e));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.hdrBtn} onPress={() => router.back()}>
          <Icon name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text weight="bold" size={16}>
          Review expense
        </Text>
        <View style={styles.scannedPill}>
          <Icon name="checkCircle" size={15} color={colors.ink} />
          <Text weight="semibold" size={12.5} color={colors.ink2}>
            Scanned
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* amount hero */}
        <Card style={styles.heroCard}>
          {draft.imageUri ? (
            <Image source={{ uri: draft.imageUri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}>
              <Icon name="note" size={22} color={colors.ink3} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Eyebrow style={{ marginBottom: 6 }}>Total · {draft.parsed.currency || "CAD"}</Eyebrow>
            <View style={styles.amountRow}>
              <Text weight="bold" size={34} color={colors.ink3}>
                $
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.ink3}
              />
            </View>
            <Text size={13} color={colors.ink3}>
              Tap to edit amount
            </Text>
          </View>
        </Card>

        {/* fields */}
        <Card style={styles.fieldsCard}>
          <Field label="Merchant">
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Store name"
              placeholderTextColor={colors.ink3}
              style={styles.fieldInput}
            />
          </Field>
          <Field label="Date" icon="calendar">
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-06-10"
              placeholderTextColor={colors.ink3}
              autoCapitalize="none"
              style={styles.fieldInput}
            />
          </Field>
          <Field label="Notes" icon="note" last>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional"
              placeholderTextColor={colors.ink3}
              style={styles.fieldInput}
            />
          </Field>
        </Card>

        {/* category grid */}
        <Eyebrow style={{ paddingHorizontal: 6, paddingBottom: 10 }}>Category</Eyebrow>
        <View style={styles.grid}>
          {(categories ?? []).map((c) => {
            const on = c.name === category;
            const meta = categoryMeta(c.name);
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.name)}
                style={[styles.catTile, on && styles.catTileOn]}
              >
                <Icon
                  name={meta.glyph as IconName}
                  size={22}
                  color={on ? colors.accentInk : colors.ink}
                  sw={1.7}
                />
                <Text weight="semibold" size={11.5} color={on ? colors.accentInk : colors.ink}>
                  {c.name.split(" ")[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* itemised */}
        {items.length > 0 && (
          <Card style={styles.itemsCard}>
            <Pressable style={styles.itemsHead} onPress={() => setShowItems((s) => !s)}>
              <Text weight="bold" size={15}>
                Itemised · {items.length}
              </Text>
              <Icon name="chevD" size={18} color={colors.ink3} />
            </Pressable>
            {showItems && (
              <View style={{ marginTop: 14 }}>
                {items.map((li, i) => (
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
                <View style={styles.hairline} />
                <SumRow label="Items subtotal" v={itemsSum} />
                {draft.parsed.tax > 0 && <SumRow label="Tax" v={draft.parsed.tax} />}
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {/* save bar */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 14 }]}>
        <PrimaryButton label="Save expense" icon="check" loading={saving} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  icon,
  last,
  children,
}: {
  label: string;
  icon?: IconName;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Text size={13.5} color={colors.ink3} style={{ width: 78 }}>
        {label}
      </Text>
      <View style={{ flex: 1 }}>{children}</View>
      {icon && <Icon name={icon} size={18} color={colors.ink3} />}
    </View>
  );
}

function SumRow({ label, v }: { label: string; v: number }) {
  return (
    <View style={styles.sumRow}>
      <Text size={14} color={colors.ink2}>
        {label}
      </Text>
      <Text size={14} tnum color={colors.ink2}>
        {money(v)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: colors.canvas },
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
  scannedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  heroCard: { padding: 20, marginBottom: 12, flexDirection: "row", gap: 16, alignItems: "center" },
  thumb: { width: 58, height: 74, borderRadius: 10, backgroundColor: "#fafafa", borderWidth: 1, borderColor: colors.hair },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  amountRow: { flexDirection: "row", alignItems: "center" },
  amountInput: {
    fontFamily: "SchibstedGrotesk_700Bold",
    fontSize: 38,
    color: colors.ink,
    padding: 0,
    minWidth: 120,
    letterSpacing: -1,
  },
  fieldsCard: { paddingHorizontal: 16, marginBottom: 12 },
  field: { flexDirection: "row", alignItems: "center", minHeight: 56, gap: 12 },
  fieldDivider: { borderBottomWidth: 1, borderBottomColor: colors.hair2 },
  fieldInput: {
    fontFamily: "SchibstedGrotesk_600SemiBold",
    fontSize: 15.5,
    color: colors.ink,
    padding: 0,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  catTile: {
    width: "31.7%",
    alignItems: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  catTileOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  itemsCard: { padding: 16 },
  itemsHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
  hairline: { height: 1, backgroundColor: colors.hair2, marginVertical: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
});
