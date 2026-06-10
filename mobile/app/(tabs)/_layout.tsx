import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/ui/Icon";
import { Text } from "@/ui/Text";
import { colors, radius } from "@/theme";

// Custom bottom bar: Home | center Scan action | History.
function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tabs: { name: string; label: string; icon: IconName }[] = [
    { name: "index", label: "Home", icon: "home" },
    { name: "history", label: "History", icon: "list" },
  ];

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.row}>
        <TabItem
          {...tabs[0]}
          active={state.index === 0}
          onPress={() => navigation.navigate(tabs[0].name)}
        />

        <Pressable
          style={({ pressed }) => [styles.scan, pressed && { transform: [{ scale: 0.94 }] }]}
          onPress={() => router.push("/scan")}
        >
          <Icon name="scan" size={28} color={colors.accentInk} sw={1.9} />
        </Pressable>

        <TabItem
          {...tabs[1]}
          active={state.index === 1}
          onPress={() => navigation.navigate(tabs[1].name)}
        />
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}) {
  const tint = active ? colors.ink : colors.ink3;
  return (
    <Pressable style={styles.item} onPress={onPress} hitSlop={10}>
      <Icon name={icon} size={22} color={tint} sw={active ? 2 : 1.75} />
      <Text weight={active ? "semibold" : "medium"} size={11} color={tint} style={{ marginTop: 3 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 64,
    paddingHorizontal: 24,
  },
  item: { alignItems: "center", justifyContent: "center", width: 64 },
  scan: {
    width: 60,
    height: 60,
    borderRadius: radius.md + 4,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
