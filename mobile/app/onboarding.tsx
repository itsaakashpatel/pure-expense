import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isConfigured, loadSettings } from "@/lib/settings";
import { colors } from "@/theme";
import { Card, PrimaryButton } from "@/ui/components";
import { Icon } from "@/ui/Icon";
import { Eyebrow, Text } from "@/ui/Text";

// Shown when the app isn't yet pointed at a Worker. Routes to Settings to connect,
// and forwards to the dashboard as soon as a URL + token exist (e.g. on returning
// from Settings after saving).
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        if (isConfigured(s)) router.replace("/");
      });
    }, [router]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      {/* hero — stacked receipt cards */}
      <View style={styles.hero}>
        <ReceiptGhost style={{ transform: [{ rotate: "-8deg" }, { translateX: -46 }], opacity: 0.55 }} />
        <ReceiptGhost style={{ transform: [{ rotate: "7deg" }, { translateX: 52 }], opacity: 0.8 }} />
        <ReceiptGhost active style={{ transform: [{ rotate: "-2deg" }] }} />
        <View style={styles.scanBadge}>
          <Icon name="scan" size={30} color={colors.accentInk} sw={1.9} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 26 }}>
        <Eyebrow style={{ marginBottom: 14 }}>Pure · Expenses</Eyebrow>
        <Text weight="bold" size={38} style={{ lineHeight: 40, letterSpacing: -1.1 }}>
          Scan a receipt.{"\n"}Log it in seconds.
        </Text>
        <Text size={17} color={colors.ink2} style={{ marginTop: 16, lineHeight: 25 }}>
          Point your camera, review what we read, and save. Every expense, verified before it counts.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 26, gap: 12, marginTop: 28 }}>
        <PrimaryButton label="Connect your backend" icon="scan" onPress={() => router.push("/settings")} />
        <Text
          weight="semibold"
          size={16}
          color={colors.ink2}
          style={{ textAlign: "center", paddingVertical: 12 }}
          onPress={() => router.push("/settings")}
        >
          Enter API details
        </Text>
      </View>
    </View>
  );
}

function ReceiptGhost({ active, style }: { active?: boolean; style?: object }) {
  const lines = [0.9, 0.55, 0.7, 0.4];
  return (
    <Card
      style={[
        styles.ghost,
        active && styles.ghostActive,
        { position: "absolute" },
        style,
      ]}
    >
      <View style={styles.ghostHead}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: colors.ink }} />
        <View style={{ width: 44, height: 8, borderRadius: 4, backgroundColor: colors.hair }} />
      </View>
      {lines.map((w, i) => (
        <View key={i} style={styles.ghostLine}>
          <View style={{ width: `${w * 100}%`, height: 7, borderRadius: 4, backgroundColor: colors.hair2 }} />
          <View style={{ width: 28, height: 7, borderRadius: 4, backgroundColor: colors.hair }} />
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: colors.hair, marginVertical: 8 }} />
      <View style={styles.ghostHead}>
        <View style={{ width: 40, height: 9, borderRadius: 4, backgroundColor: colors.ink3 }} />
        <View style={{ width: 56, height: 13, borderRadius: 4, backgroundColor: colors.ink }} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center" },
  ghost: { width: 210, borderRadius: 16, padding: 16 },
  ghostActive: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 10,
  },
  ghostHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ghostLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  scanBadge: {
    position: "absolute",
    bottom: 24,
    right: 40,
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
});
