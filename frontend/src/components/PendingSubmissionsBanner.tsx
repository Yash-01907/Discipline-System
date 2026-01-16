import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { usePendingSubmissions } from "../stores/pendingSubmissions";
import { COLORS, SPACING } from "../constants/theme";

interface Props {
  onSyncComplete?: (success: number, failed: number) => void;
}

const PendingSubmissionsBanner: React.FC<Props> = ({ onSyncComplete }) => {
  const { submissions, isSyncing, syncPendingSubmissions } =
    usePendingSubmissions();
  const [isOnline, setIsOnline] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnline;
      setIsOnline(state.isConnected ?? false);

      // Auto-sync when coming back online
      if (wasOffline && state.isConnected && submissions.length > 0) {
        handleSync();
      }
    });

    return () => unsubscribe();
  }, [isOnline, submissions.length]);

  useEffect(() => {
    // Animate banner in/out
    Animated.timing(fadeAnim, {
      toValue: submissions.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [submissions.length]);

  const handleSync = async () => {
    if (isSyncing) return;

    const result = await syncPendingSubmissions();
    if (onSyncComplete) {
      onSyncComplete(result.success, result.failed);
    }
  };

  if (submissions.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{isOnline ? "📤" : "📵"}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {submissions.length} pending submission
            {submissions.length > 1 ? "s" : ""}
          </Text>
          <Text style={styles.subtitle}>
            {isOnline ? "Tap to sync now" : "Will sync when back online"}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.syncButton,
            (!isOnline || isSyncing) && styles.syncButtonDisabled,
          ]}
          onPress={handleSync}
          disabled={!isOnline || isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.syncButtonText}>
              {isOnline ? "Sync" : "Offline"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Show individual pending items */}
      {submissions.length <= 3 && (
        <View style={styles.itemsList}>
          {submissions.map((submission) => (
            <View key={submission.id} style={styles.itemRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                • {submission.habitTitle}
              </Text>
              {submission.lastError && (
                <Text style={styles.itemError} numberOfLines={1}>
                  {submission.lastError}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.m,
    marginBottom: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.m,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.m,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  syncButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  syncButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 12,
  },
  itemsList: {
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.s,
  },
  itemTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  itemError: {
    color: COLORS.error || "#EF4444",
    fontSize: 10,
    marginLeft: SPACING.s,
    maxWidth: "40%",
  },
});

export default PendingSubmissionsBanner;
