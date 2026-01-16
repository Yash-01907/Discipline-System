import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const getBackendUrl = () => {
  // 1. If explicitly defined in creating the build/env, use it (Production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. In development (Expo Go), dynamically grab the host IP
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    // Port 5000 is our backend port
    return `http://${ip}:5000/api`;
  }

  // 3. Fallback for Android Emulator (10.0.2.2) or iOS Simulator (localhost)
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
};

// ===== Token Cache (Memory) =====
// Avoids repeated SecureStore native bridge calls on every request
let cachedToken: string | null = null;

export const setAuthToken = async (token: string) => {
  cachedToken = token;
  await SecureStore.setItemAsync("userToken", token);
};

export const clearAuthToken = async () => {
  cachedToken = null;
  await SecureStore.deleteItemAsync("userToken");
};

export const getAuthToken = () => cachedToken;

// Call this once on app startup to hydrate the cache
export const initializeAuthToken = async () => {
  try {
    cachedToken = await SecureStore.getItemAsync("userToken");
  } catch (error) {
    console.log("Error initializing token from SecureStore", error);
  }
};
// ================================

const client = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the token (uses cached token)
client.interceptors.request.use(
  (config) => {
    if (cachedToken) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
