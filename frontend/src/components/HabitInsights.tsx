import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { ContributionGraph, LineChart } from "react-native-chart-kit";
import { Svg, Circle, Line, Text as SvgText, G } from "react-native-svg";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { Submission } from "../api/submissions";

interface Props {
  submissions: Submission[];
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const HabitInsights = ({ submissions }: Props) => {
  // --- 1. Consistency Heatmap Data ---
  const heatmapData = useMemo(() => {
    // Count verified submissions per date
    const counts: { [date: string]: number } = {};
    submissions.forEach((sub) => {
      if (sub.aiVerificationResult) {
        const dateStr = new Date(sub.timestamp).toISOString().split("T")[0];
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      }
    });

    return Object.keys(counts).map((date) => ({
      date,
      count: counts[date],
    }));
  }, [submissions]);

  // --- 2. Scatter Plot Data (Time vs Date) ---
  const scatterData = useMemo(() => {
    return submissions
      .filter((s) => s.aiVerificationResult)
      .map((s) => {
        const d = new Date(s.timestamp);
        const dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        // Time as decimal hours (e.g., 14:30 = 14.5)
        const time = d.getHours() + d.getMinutes() / 60;
        return { date: d, time, label: dateStr };
      })
      .slice(0, 10); // Limit to last 10 points for cleanliness in MVP
  }, [submissions]);

  // --- 3. Streak Momentum (Area Chart) ---
  const streakData = useMemo(() => {
    // Calculate running streak over the last 30 days
    // This is a simplified "Momentum" view.
    // Real streak logic depends on daily frequency gaps.
    // For MVP visualization, we will just accumulate "verified" counts in windows or just show cumulative verified count over last 7 entries?
    // Better: Show "Rolling 3-day completion count" or just the raw counts.
    // Let's emulate a "Current Streak" over time.

    const sorted = [...submissions]
      .filter((s) => s.aiVerificationResult)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    // Generate a mock "streak" value (just cumulative for visual "momentum" or strictly consecutive)
    // Let's do cumulative for area chart beauty
    let currentStreak = 0;
    const dataPoints: number[] = [];
    const labels: string[] = [];

    // Take last 7 successful submissions
    const recent = sorted.slice(-7);

    recent.forEach((s, i) => {
      currentStreak += 1; // Simplified
      dataPoints.push(currentStreak);
      labels.push(new Date(s.timestamp).getDate().toString());
    });

    if (dataPoints.length < 2) return null; // Need at least 2 points

    return {
      labels,
      datasets: [{ data: dataPoints }],
    };
  }, [submissions]);

  if (submissions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Not enough data for insights.</Text>
      </View>
    );
  }

  // Helper for Scatter Plot
  const renderScatterPlot = () => {
    if (scatterData.length === 0) return null;

    const height = 200;
    const width = SCREEN_WIDTH - SPACING.m * 2;
    const padding = 20;

    return (
      <View style={styles.chartWrapper}>
        <Text style={styles.chartTitle}>⏳ Timing Consistency</Text>
        <Svg height={height} width={width}>
          {/* Axes */}
          <Line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke={COLORS.border}
            strokeWidth="1"
          />
          <Line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke={COLORS.border}
            strokeWidth="1"
          />

          {/* Y-Axis Labels (0, 12, 24) */}
          <SvgText
            x={0}
            y={height - padding}
            fontSize="10"
            fill={COLORS.textSecondary}
          >
            0h
          </SvgText>
          <SvgText
            x={0}
            y={height / 2}
            fontSize="10"
            fill={COLORS.textSecondary}
          >
            12h
          </SvgText>
          <SvgText
            x={0}
            y={padding + 10}
            fontSize="10"
            fill={COLORS.textSecondary}
          >
            24h
          </SvgText>

          {/* Data Points */}
          {scatterData.map((point, index) => {
            // Map Time (0-24) to Y (height-padding to padding)
            const y =
              height - padding - (point.time / 24) * (height - 2 * padding);
            // Map Index to X
            const x =
              padding +
              (index / (scatterData.length - 1 || 1)) * (width - 2 * padding);

            return (
              <G key={index}>
                <Circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={COLORS.primary}
                  opacity={0.8}
                />
                <SvgText
                  x={x}
                  y={height - 5}
                  fontSize="10"
                  fill={COLORS.textSecondary}
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Heatmap */}
      <View style={styles.chartWrapper}>
        <Text style={styles.chartTitle}>🔥 Consistency Heatmap</Text>
        <ContributionGraph
          values={heatmapData}
          endDate={new Date()}
          numDays={90}
          width={SCREEN_WIDTH - SPACING.m * 2}
          height={220}
          chartConfig={{
            backgroundColor: COLORS.surface,
            backgroundGradientFrom: COLORS.surface,
            backgroundGradientTo: COLORS.surface,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald
            labelColor: (opacity = 1) => COLORS.textSecondary,
          }}
          tooltipDataAttrs={() => ({})}
        />
      </View>

      {/* Scatter Plot */}
      {renderScatterPlot()}

      {/* Momentum */}
      {streakData && (
        <View style={styles.chartWrapper}>
          <Text style={styles.chartTitle}>🚀 Streak Momentum</Text>
          <LineChart
            data={streakData}
            width={SCREEN_WIDTH - SPACING.m * 2}
            height={200}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
              labelColor: (opacity = 1) => COLORS.textSecondary,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: COLORS.primary,
              },
              fillShadowGradientFrom: COLORS.primary,
              fillShadowGradientTo: COLORS.background, // Fade out
            }}
            bezier
            withInnerLines={false}
            withOuterLines={false}
            style={{ borderRadius: 16 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.l,
  },
  chartWrapper: {
    marginBottom: SPACING.l,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.m,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.m,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyContainer: {
    padding: SPACING.l,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
});

export default HabitInsights;
