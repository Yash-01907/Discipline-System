import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persister } from "@tanstack/react-query-persist-client";

/**
 * Custom AsyncStorage persister for React Query
 * Caches query data to enable offline access
 */
export const asyncStoragePersister: Persister = {
  persistClient: async (client) => {
    try {
      await AsyncStorage.setItem(
        "DISCIPLINE_REACT_QUERY_CACHE",
        JSON.stringify(client)
      );
    } catch (error) {
      console.error("Failed to persist query cache:", error);
    }
  },
  restoreClient: async () => {
    try {
      const cached = await AsyncStorage.getItem("DISCIPLINE_REACT_QUERY_CACHE");
      return cached ? JSON.parse(cached) : undefined;
    } catch (error) {
      console.error("Failed to restore query cache:", error);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await AsyncStorage.removeItem("DISCIPLINE_REACT_QUERY_CACHE");
    } catch (error) {
      console.error("Failed to remove query cache:", error);
    }
  },
};

/**
 * Query client configuration for offline support
 */
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache data for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus for mobile
      refetchOnWindowFocus: false,
      // Enable network mode for offline support
      networkMode: "offlineFirst" as const,
    },
    mutations: {
      // Retry mutations on network failure
      retry: 2,
      networkMode: "offlineFirst" as const,
    },
  },
};

/**
 * Persist options for the query client
 */
export const persistOptions = {
  persister: asyncStoragePersister,
  // Maximum age of cached data (24 hours)
  maxAge: 1000 * 60 * 60 * 24,
  // Only persist successful queries
  dehydrateOptions: {
    shouldDehydrateQuery: (query: any) => {
      // Only cache successful queries
      return query.state.status === "success";
    },
  },
};
