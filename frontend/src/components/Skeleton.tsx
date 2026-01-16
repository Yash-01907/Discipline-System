import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { COLORS, SPACING } from "../constants/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonItem = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton for a single Habit Card
export const HabitCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <SkeletonItem width={40} height={40} borderRadius={20} />
      <View style={styles.cardHeaderText}>
        <SkeletonItem width="60%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonItem width="40%" height={12} />
      </View>
      <SkeletonItem width={50} height={24} borderRadius={12} />
    </View>
    <SkeletonItem
      width="100%"
      height={8}
      borderRadius={4}
      style={{ marginTop: 12 }}
    />
  </View>
);

// Skeleton for Habit Details page
export const HabitDetailsSkeleton = () => (
  <View style={styles.detailsContainer}>
    {/* Stats Row */}
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <SkeletonItem width="60%" height={12} style={{ marginBottom: 8 }} />
        <SkeletonItem width={60} height={32} />
      </View>
      <View style={styles.statCard}>
        <SkeletonItem width="60%" height={12} style={{ marginBottom: 8 }} />
        <SkeletonItem width={40} height={32} />
      </View>
    </View>

    {/* Section Title */}
    <SkeletonItem width={120} height={14} style={{ marginBottom: SPACING.m }} />

    {/* Charts placeholder */}
    <View style={styles.chartPlaceholder}>
      <SkeletonItem width="100%" height={200} borderRadius={16} />
    </View>

    {/* Info Card */}
    <View style={styles.infoCard}>
      <SkeletonItem width={80} height={12} style={{ marginBottom: 8 }} />
      <SkeletonItem width="100%" height={16} style={{ marginBottom: 16 }} />
      <SkeletonItem width={80} height={12} style={{ marginBottom: 8 }} />
      <SkeletonItem width="50%" height={16} />
    </View>
  </View>
);

// Multiple card skeletons for list
export const HabitListSkeleton = ({ count = 3 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <HabitCardSkeleton key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.m,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: SPACING.m,
  },
  detailsContainer: {
    padding: SPACING.m,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.m,
    marginBottom: SPACING.l,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 12,
    alignItems: "center",
  },
  chartPlaceholder: {
    marginBottom: SPACING.l,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderRadius: 16,
  },
});

export default SkeletonItem;
