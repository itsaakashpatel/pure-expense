import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { parseMoneyToCents } from "@/lib/format";
import { clearSettings, loadSettings, saveSettings } from "@/lib/settings";
import { colors, radius } from "@/theme";
import { Card, PrimaryButton } from "@/ui/components";
import { Icon } from "@/ui/Icon";
import { Eyebrow, Text } from "@/ui/Text";

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [budget, setBudget] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setBaseUrl(s.baseUrl);
      setToken(s.token);
      setBudget(s.budget ? (s.budget / 100).toFixed(0) : "");
      setLoaded(true);
    });
  }, []);

  async function onSave() {
    const url = baseUrl.trim();
    if (!/^https?:\/\//.test(url)) {
      Alert.alert("Invalid URL", "Include http:// or https://");
      return;
    }
    await saveSettings({
      baseUrl: url,
      token: token.trim(),
      budget: budget ? parseMoneyToCents(budget) : 0,
    });
    router.back();
  }

  function onReset() {
    Alert.alert(
      "Reset connection?",
      "This clears the saved API URL and token from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await clearSettings();
            router.replace("/onboarding");
          },
        },
      ],
    );
  }

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.hdrBtn} onPress={() => router.back()}>
          <Icon name="close" size={20} color={colors.ink} />
        </Pressable>
        <Text weight="bold" size={16}>
          Settings
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Text size={14} color={colors.ink2} style={{ lineHeight: 20 }}>
          Point the app at your Cloudflare Worker and paste the AUTH_TOKEN you configured. Both are
          stored securely on this device.
        </Text>

        <View style={{ gap: 12 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>Connection</Eyebrow>
          <Card style={styles.fieldsCard}>
            <LabeledInput
              label="API URL"
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="https://pure-expense.you.workers.dev"
              keyboardType="url"
            />
            <LabeledInput
              label="Auth token"
              value={token}
              onChangeText={setToken}
              placeholder="AUTH_TOKEN"
              secureTextEntry
              last
            />
          </Card>
        </View>

        <View style={{ gap: 12 }}>
          <Eyebrow style={{ paddingHorizontal: 4 }}>Monthly budget</Eyebrow>
          <Card style={styles.fieldsCard}>
            <LabeledInput
              label="Budget ($)"
              value={budget}
              onChangeText={setBudget}
              placeholder="2200 (optional)"
              keyboardType="number-pad"
              last
            />
          </Card>
        </View>

        <PrimaryButton label="Save" onPress={onSave} />

        <Pressable style={styles.resetBtn} onPress={onReset}>
          <Icon name="trash" size={18} color={colors.ink2} />
          <Text weight="semibold" size={15} color={colors.ink2}>
            Reset connection
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabeledInput({
  label,
  last,
  ...input
}: {
  label: string;
  last?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.field, !last && styles.fieldDivider]}>
      <Text size={13.5} color={colors.ink3} style={{ width: 92 }}>
        {label}
      </Text>
      <TextInput
        {...input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.ink3}
        style={styles.input}
      />
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
  fieldsCard: { paddingHorizontal: 16 },
  field: { flexDirection: "row", alignItems: "center", minHeight: 56, gap: 12 },
  fieldDivider: { borderBottomWidth: 1, borderBottomColor: colors.hair2 },
  input: {
    flex: 1,
    fontFamily: "SchibstedGrotesk_600SemiBold",
    fontSize: 15.5,
    color: colors.ink,
    padding: 0,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
});
