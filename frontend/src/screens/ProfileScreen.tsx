import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useHabits } from "../hooks/useHabits";
import { LineChart } from "react-native-chart-kit";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ProfileScreen = () => {
  const { data: habits } = useHabits();

  const stats = useMemo(() => {
    if (!habits || habits.length === 0)
      return {
        overall: 0,
        chartData: [0, 0, 0, 0, 0, 0],
        labels: ["S", "M", "T", "W", "T", "F"],
      };

    // Mocking analytics for MVP visualization
    // In real app, we iterate over Submission logs.
    const totalStreaks = habits.reduce((acc, h) => acc + h.currentStreak, 0);
    // Assuming average potential is higher, just a dummy calculation
    const overallRate = Math.min(
      100,
      Math.round((totalStreaks / (habits.length * 10 || 1)) * 100)
    ); // normalized dummy

    return {
      overall: overallRate,
      chartData: [20, 45, 28, 80, 99, 43], // Placeholder for "Completion rates over time"
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    };
  }, [habits]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Dashboard</Text>

      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Overall Discipline</Text>
        <Text style={styles.statValue}>{stats.overall}%</Text>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${stats.overall}%` }]}
          />
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
