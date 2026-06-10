import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError } from "@/api/client";
import { setDraft } from "@/lib/draft";
import { recognizeReceiptText } from "@/ocr/recognize";
import { colors } from "@/theme";
import { Icon } from "@/ui/Icon";
import { Text } from "@/ui/Text";

const STEPS = ["Detecting edges", "Reading text", "Finding total"];

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  // Looping scan line over the detection frame.
  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  async function processImage(uri: string) {
    setBusy(true);
    setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 600);
    try {
      // 1) On-device OCR.
      let rawText = "";
      try {
        rawText = await recognizeReceiptText(uri);
      } catch (e) {
        Alert.alert("Couldn't read image", String((e as Error)?.message ?? e));
        return;
      }
      if (!rawText) {
        Alert.alert(
          "No text found",
          "Couldn't read any text. Fill the frame with the receipt, use good lighting, and hold steady.",
        );
        return;
      }

      // 2) Structure it via the Worker. Surface the real error so failures
      // (e.g. /api/parse returning 502 because Workers AI has no account set)
      // are visible instead of silently producing a blank draft.
      try {
        const parsed = await api.parseReceipt(rawText);
        // Diagnostic: parse returned 200 but extracted nothing — surface the OCR
        // text so we can tell whether OCR or the model is the problem.
        if (!parsed.merchant && !parsed.total) {
          Alert.alert(
            "Parsed empty — debug",
            `OCR chars: ${rawText.length}\n\nOCR text:\n${rawText.slice(0, 220)}`,
          );
        }
        setDraft({ imageUri: uri, parsed, rawText });
        router.replace("/review");
      } catch (e) {
        const msg = e instanceof ApiError ? `(${e.status}) ${e.message}` : String(e);
        Alert.alert(
          "Couldn't extract details",
          `${msg}\n\nYou can still enter the details manually.`,
        );
        setDraft({ imageUri: uri, parsed: emptyDraft(), rawText });
        router.replace("/review");
      }
    } finally {
      clearInterval(tick);
      setBusy(false);
    }
  }

  async function capture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) await processImage(photo.uri);
  }

  async function pickFromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets[0]?.uri) await processImage(res.assets[0].uri);
  }

  if (!permission) {
    return (
      <View style={styles.permWrap}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permWrap, { padding: 28, gap: 18 }]}>
        <Text color="#fff" size={16} style={{ textAlign: "center" }}>
          Camera access is needed to scan receipts.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text weight="semibold" color={colors.ink}>
            Grant permission
          </Text>
        </Pressable>
        <Pressable onPress={pickFromLibrary}>
          <Text color="rgba(255,255,255,0.7)">Pick from library instead</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text color="rgba(255,255,255,0.5)">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
      <View style={styles.scrim} />

      {/* top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <GlassBtn name="close" onPress={() => router.back()} />
        <Text weight="semibold" color="#fff" size={16}>
          Scan receipt
        </Text>
        <GlassBtn name="flash" active={torch} onPress={() => setTorch((t) => !t)} />
      </View>

      {/* detection frame */}
      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <Corner style={{ top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 }} />
          <Corner style={{ top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 }} />
          <Corner style={{ bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 }} />
          <Corner style={{ bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 }} />
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
        </View>
        <Text color="rgba(255,255,255,0.75)" size={14} style={{ marginTop: 22 }}>
          Position the receipt inside the frame
        </Text>
      </View>

      {/* controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 28 }]}>
        <GlassBtn name="image" size={50} onPress={pickFromLibrary} />
        <Pressable onPress={capture} style={styles.shutter}>
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={{ width: 50 }} />
      </View>

      {/* reading overlay */}
      {busy && (
        <View style={styles.reading}>
          <ActivityIndicator size="large" color="#fff" />
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text weight="semibold" color="#fff" size={17}>
              Reading receipt
            </Text>
            <Text color="rgba(255,255,255,0.6)" size={14}>
              {STEPS[step]}…
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: i <= step ? "#fff" : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function GlassBtn({
  name,
  onPress,
  size = 44,
  active,
}: {
  name: "close" | "flash" | "image";
  onPress?: () => void;
  size?: number;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.glass,
        { width: size, height: size },
        active && { backgroundColor: "#fff" },
      ]}
    >
      <Icon name={name} size={size * 0.45} color={active ? colors.ink : "#fff"} />
    </Pressable>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0B0C" },
  permWrap: { flex: 1, backgroundColor: "#0B0B0C", alignItems: "center", justifyContent: "center" },
  permBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  frameWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: 250, height: 300, position: "relative" },
  corner: { position: "absolute", width: 26, height: 26, borderColor: "#fff" },
  scanLine: {
    position: "absolute",
    left: 6,
    right: 6,
    top: "50%",
    height: 2,
    borderRadius: 2,
    backgroundColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.9)",
    padding: 5,
  },
  shutterInner: { flex: 1, borderRadius: 999, backgroundColor: "#fff" },
  glass: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  reading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(6,6,8,0.78)",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
  },
});

function emptyDraft() {
  return {
    merchant: "",
    total: 0,
    tax: 0,
    currency: "CAD",
    category: "Shopping",
    purchasedAt: new Date().toISOString().slice(0, 10),
    lineItems: [],
  };
}
