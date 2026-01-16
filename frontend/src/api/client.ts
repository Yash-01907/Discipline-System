import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

let baseURL = "http://localhost:5000/api";

if (Platform.OS !== "web") {
  // Try to get the host URI from Expo config (works for physical devices via Expo Go)
  const debuggerHost = Constants.expoConfig?.hostUri;

  if (debuggerHost) {
    // debuggerHost is in format "192.168.x.x:8081". We extract the IP.
    const ip = debuggerHost.split(":")[0];
    baseURL = `http://${ip}:5000/api`;
  } else if (Platform.OS === "android") {
    // Fallback for Android Emulator if hostUri is missing
    baseURL = "http://10.0.2.2:5000/api";
  }
}

console.log("Connecting to Backend at:", baseURL);

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default client;
