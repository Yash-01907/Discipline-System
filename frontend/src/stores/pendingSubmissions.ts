import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system";
import { verifySubmission } from "../api/habits";

export interface PendingSubmission {
  id: string;
  habitId: string;
  habitTitle: string;
  imageUri: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

interface PendingSubmissionsState {
  submissions: PendingSubmission[];
  isSyncing: boolean;
  lastSyncAttempt: string | null;

  // Actions
  addSubmission: (
    habitId: string,
    habitTitle: string,
    imageUri: string
  ) => void;
  removeSubmission: (id: string) => void;
  updateSubmissionError: (id: string, error: string) => void;
  clearAllSubmissions: () => void;
  syncPendingSubmissions: () => Promise<{
    success: number;
    failed: number;
  }>;
  getSyncStatus: () => {
    pendingCount: number;
    isSyncing: boolean;
    lastSyncAttempt: string | null;
  };
}

export const usePendingSubmissions = create<PendingSubmissionsState>()(
  persist(
    (set, get) => ({
      submissions: [],
      isSyncing: false,
      lastSyncAttempt: null,

      addSubmission: async (habitId, habitTitle, imageUri) => {
        try {
          // Move file from cache to document directory for persistence
          const fileName = imageUri.split("/").pop();
          // Ensure documentDirectory is not null (though it rarely is on devices)
          // @ts-ignore
          const docDir = FileSystem.documentDirectory || "";
          const newPath = `${docDir}${fileName}`;

          await FileSystem.moveAsync({
            from: imageUri,
            to: newPath,
          });

          const newSubmission: PendingSubmission = {
            id: `pending-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            habitId,
            habitTitle,
            imageUri: newPath, // Store persistent path
            createdAt: new Date().toISOString(),
            retryCount: 0,
          };

          set((state) => ({
            submissions: [...state.submissions, newSubmission],
          }));

          console.log(`Added pending submission (persistent): ${habitTitle}`);
        } catch (error) {
          console.error("Failed to save pending submission image:", error);
          // Fallback: Try to add with original URI if move fails
          const newSubmission: PendingSubmission = {
            id: `pending-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            habitId,
            habitTitle,
            imageUri: imageUri,
            createdAt: new Date().toISOString(),
            retryCount: 0,
          };
          set((state) => ({
            submissions: [...state.submissions, newSubmission],
          }));
        }
      },

      removeSubmission: (id) => {
        set((state) => ({
          submissions: state.submissions.filter((s) => s.id !== id),
        }));
      },

      updateSubmissionError: (id, error) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  lastError: error,
                  retryCount: s.retryCount + 1,
                }
              : s
          ),
        }));
      },

      clearAllSubmissions: () => {
        set({ submissions: [] });
      },

      syncPendingSubmissions: async () => {
        const { submissions, isSyncing } = get();

        if (isSyncing || submissions.length === 0) {
          return { success: 0, failed: 0 };
        }

        // Check network connectivity first
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          console.log("No network connection, skipping sync");
          return { success: 0, failed: submissions.length };
        }

        set({ isSyncing: true, lastSyncAttempt: new Date().toISOString() });

        let successCount = 0;
        let failedCount = 0;

        for (const submission of submissions) {
          try {
            console.log(
              `Syncing submission for habit: ${submission.habitTitle}`
            );

            const result = await verifySubmission(
              submission.habitId,
              submission.imageUri
            );

            if (result) {
              // Successfully synced - remove from queue
              get().removeSubmission(submission.id);
              successCount++;
              console.log(`Successfully synced: ${submission.habitTitle}`);
            }
          } catch (error: any) {
            // Check if it's a network error (should retry later) vs server error (might not retry)
            const isNetworkError =
              !error.response || error.code === "NETWORK_ERROR";
            const errorMessage =
              error.response?.data?.message || error.message || "Unknown error";

            get().updateSubmissionError(submission.id, errorMessage);
            failedCount++;

            console.log(
              `Failed to sync ${submission.habitTitle}: ${errorMessage}`
            );

            // If it's a 4xx client error (except timeout), don't retry indefinitely
            if (
              error.response?.status >= 400 &&
              error.response?.status < 500 &&
              error.response?.status !== 408
            ) {
              // Mark as failed permanently after 3 retries for client errors
              if (submission.retryCount >= 3) {
                console.log(
                  `Removing permanently failed submission: ${submission.habitTitle}`
                );
                get().removeSubmission(submission.id);
              }
            }
          }
        }

        set({ isSyncing: false });

        return { success: successCount, failed: failedCount };
      },

      getSyncStatus: () => {
        const state = get();
        return {
          pendingCount: state.submissions.length,
          isSyncing: state.isSyncing,
          lastSyncAttempt: state.lastSyncAttempt,
        };
      },
    }),
    {
      name: "pending-submissions-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        submissions: state.submissions,
        lastSyncAttempt: state.lastSyncAttempt,
      }),
    }
  )
);

// Helper hook to check if there are pending submissions
export const usePendingCount = () => {
  return usePendingSubmissions((state) => state.submissions.length);
};
