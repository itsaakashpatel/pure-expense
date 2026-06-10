import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Hybrid storage:
//  - AUTH_TOKEN is a credential → encrypted Keychain via expo-secure-store.
//  - API URL + monthly budget are non-sensitive prefs → AsyncStorage (also
//    cleared automatically when the app is uninstalled).
const TOKEN_KEY = "pe.authToken";
const BASE_URL_KEY = "pe.baseUrl";
const BUDGET_KEY = "pe.monthlyBudget";

export type Settings = {
  baseUrl: string;
  token: string;
  budget: number; // cents; 0 = no budget set
};

export async function loadSettings(): Promise<Settings> {
  const [token, baseUrl, budget] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    AsyncStorage.getItem(BASE_URL_KEY),
    AsyncStorage.getItem(BUDGET_KEY),
  ]);
  return {
    token: token ?? "",
    baseUrl: baseUrl ?? "",
    budget: budget ? Number(budget) : 0,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, settings.token),
    AsyncStorage.setItem(BASE_URL_KEY, settings.baseUrl.replace(/\/+$/, "")),
    AsyncStorage.setItem(BUDGET_KEY, String(settings.budget || 0)),
  ]);
}

// Fully clear the connection — removes the token from the Keychain (which would
// otherwise survive an app reinstall on iOS) and the prefs from AsyncStorage.
export async function clearSettings(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    AsyncStorage.multiRemove([BASE_URL_KEY, BUDGET_KEY]),
  ]);
}

export function isConfigured(s: Settings): boolean {
  return Boolean(s.baseUrl && s.token);
}
