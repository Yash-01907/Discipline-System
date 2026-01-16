import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserStats } from "../hooks/useHabits";
import { useAuth } from "../context/AuthContext";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ProfileScreen = () => {
  const { data: stats, isLoading } = useUserStats();
  const { logout } = useAuth(); // Add logout button potentially

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const score = stats?.disciplineScore || 0;
  const globalStreak = stats?.globalStreak || 0;
  const totalCompleted = stats?.totalCompleted || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: SPACING.l,
        }}
      >
        <Text style={[styles.header, { marginBottom: 0 }]}>Dashboard</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>
            LOG OUT
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Discipline Score</Text>
        <Text style={styles.statValue}>{score}</Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(score, 100)}%` },
            ]}
          />
        </View>
      </View>

      <View
        style={{ flexDirection: "row", gap: SPACING.m, marginTop: SPACING.m }}
      >
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>Active Streak</Text>
          <Text style={styles.statValue}>{globalStreak}</Text>
        </View>
        <View style={[styles.statCard, { flex: 1 }]}>
          <Text style={styles.statLabel}>All Time</Text>
          <Text style={styles.statValue}>{totalCompleted}</Text>
        </View>
      </View>

      <Text style={styles.subHeader}>Performance History</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          To view detailed Consistency Heatmaps, Scatter Plots, and Momentum
          charts, tap on a specific goal in the{" "}
          <Text style={{ fontWeight: "bold" }}>Home</Text> tab.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.m,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.l,
    fontFamily: FONTS.bold,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: SPACING.l,
    marginBottom: SPACING.m,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  chartContainer: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.m,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderRadius: 16,
    marginBottom: SPACING.l,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    textAlign: "center",
  },
});

export default ProfileScreen;
