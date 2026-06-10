import type { ExpoConfig } from "expo/config";

// Native modules (camera, ML Kit OCR, secure store) require an EAS dev build.
const config: ExpoConfig = {
  name: "Pure Expense",
  slug: "pure-expense",
  scheme: "pureexpense",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.pureexpense.app",
    infoPlist: {
      NSCameraUsageDescription:
        "Pure Expense uses the camera to scan your receipts.",
      NSPhotoLibraryUsageDescription:
        "Pure Expense lets you pick a receipt photo from your library.",
      // Allow plaintext HTTP so the app can reach a local `wrangler dev` Worker
      // over your LAN. Once the Worker is deployed to https://*.workers.dev this
      // can be removed (HTTPS satisfies ATS).
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsLocalNetworking: true,
      },
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0B0F14",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow Pure Expense to scan receipts with the camera.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Pure Expense to access your receipt photos.",
      },
    ],
  ],
  web: {
    favicon: "./assets/favicon.png",
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "1e3171e8-9f4c-4044-81d4-307a30268e8d",
    },
  },
};

export default config;
