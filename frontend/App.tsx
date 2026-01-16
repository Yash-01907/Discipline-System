import React, { useEffect, useRef } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as Notifications from "expo-notifications";
import AppNavigator from "./src/navigation/AppNavigator";
import { COLORS } from "./src/constants/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { requestNotificationPermissions } from "./src/utils/notifications";
import { RootStackParamList } from "./src/types/navigation";
import { queryClientConfig, persistOptions } from "./src/utils/queryPersister";

import { AuthProvider, useAuth } from "./src/context/AuthContext";

// Create query client with offline-first configuration
const queryClient = new QueryClient(queryClientConfig);

// Deep linking configuration
const linking = {
  prefixes: ["discipline://"],
  config: {
    screens: {
      Verify: "verify/:habitId/:habitTitle",
    },
  },
};

// Inner component that has access to AuthContext
function AppContent() {
  const { isLoading: authLoading } = useAuth();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);
  const notificationResponseListener = useRef<
    Notifications.EventSubscription | undefined
  >(undefined);

  useEffect(() => {
    // Request notification permissions on mount
    requestNotificationPermissions().then((granted) => {
      if (granted) {
        console.log("Notification permissions granted");
      } else {
        console.log("Notification permissions denied");
      }
    });

    // Handle notification response (when user taps on notification)
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.habitId && data?.habitTitle) {
          // Navigate to Verify screen with habit data
          navigationRef.current?.navigate("Verify", {
            habitId: data.habitId as string,
            habitTitle: data.habitTitle as string,
          });
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  // Show loading screen while auth is initializing
  // This ensures token is loaded from SecureStore before any API calls
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => {
          // Optionally resume any paused mutations after hydration
          console.log("Query cache restored from storage");
        }}
      >
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
