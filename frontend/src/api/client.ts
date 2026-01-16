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

const client = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log("Error fetching token", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default client;
