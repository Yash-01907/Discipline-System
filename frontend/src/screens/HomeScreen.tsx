import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useHabits, useUserStats } from "../hooks/useHabits";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { HabitListSkeleton } from "../components/Skeleton";
import PendingSubmissionsBanner from "../components/PendingSubmissionsBanner";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const HomeScreen = () => {
  // In tab nav, navigation might need type adjustment if jumping stacks, but usually fine.
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { data: habits, isLoading, refetch, isRefetching } = useHabits();
  const { data: userStats, refetch: refetchStats } = useUserStats();

  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  };
  const dateStr = today.toLocaleDateString("en-US", dateOptions);

  // Group Habits
  const { dailyHabits, upcomingHabits } = useMemo(() => {
    if (!habits) return { dailyHabits: [], upcomingHabits: [] };

    const daily = habits.filter(
      (h) => h.type === "recurring" || h.frequency === "Daily"
    );

    // Logic for "Upcoming":
    // 1. One-time habits in the future
    // 2. Or recurring habits not due today (if we had complex scheduling)
    // For now, let's look for type='one-time'
    const upcoming = habits.filter((h) => h.type === "one-time");

    return { dailyHabits: daily, upcomingHabits: upcoming };
  }, [habits]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.greeting}>Good Morning,</Text>
      <Text style={styles.date}>{dateStr}</Text>

      {userStats?.usage && userStats.usage.plan === "free" && (
        <TouchableOpacity
          style={styles.usageContainer}
          onPress={() => navigation.navigate("Subscription")}
          activeOpacity={0.8}
        >
          <View style={styles.usageRow}>
            <Text style={styles.usageText}>
              Daily Free Verifications:{" "}
              <Text style={styles.usageCount}>
                {userStats.usage.verifiedCount}/{userStats.usage.limit}
              </Text>
            </Text>
            {userStats.usage.verifiedCount >= userStats.usage.limit && (
              <Text style={styles.limitReached}>Limit Reached</Text>
            )}
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (userStats.usage.verifiedCount / userStats.usage.limit) *
                      100,
                    100
                  )}%`,
                  backgroundColor:
                    userStats.usage.verifiedCount >= userStats.usage.limit
                      ? COLORS.error
                      : COLORS.primary,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHabitItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("HabitDetails", {
          habitId: item._id,
          habitTitle: item.title,
        })
      }
    >
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.statusIndicator,
            item.active ? styles.active : styles.inactive,
          ]}
        />
        <View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.streakText}>{item.currentStreak} Day Streak</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.proveBtn}>
          <Text style={styles.proveBtnText}>Check-in</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {renderHeader()}
        <View style={styles.scrollContent}>
          <Text style={styles.sectionTitle}>TODAY'S GOALS</Text>
          <HabitListSkeleton count={3} />
        </View>
      </SafeAreaView>
    );
  }

  const handleRefresh = async () => {
    // We can run these concurrently
    await Promise.all([refetch(), refetchStats()]);
  };

  // Prepare sections for FlatList
  const sections = useMemo(() => {
    const result = [];

    // Today's Goals section
    result.push({
      title: "TODAY'S GOALS",
      data: dailyHabits.length > 0 ? dailyHabits : [],
      emptyMessage: "No goals set for today.",
    });

    // Upcoming Goals section
    result.push({
      title: "UPCOMING GOALS",
      data: upcomingHabits.length > 0 ? upcomingHabits : [],
      emptyMessage: "No upcoming one-time goals.",
    });

    return result;
  }, [dailyHabits, upcomingHabits]);

  // Flatten sections into a single array for FlatList
  const flattenedData = useMemo(() => {
    const items: any[] = [];
    sections.forEach((section) => {
      items.push({ type: "header", title: section.title });
      if (section.data.length === 0) {
        items.push({ type: "empty", message: section.emptyMessage });
      } else {
        section.data.forEach((habit) => {
          items.push({ type: "habit", data: habit });
        });
      }
    });
    return items;
  }, [sections]);

  const renderFlatListItem = ({ item }: { item: any }) => {
    if (item.type === "header") {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    }

    if (item.type === "empty") {
      return <Text style={styles.emptyText}>{item.message}</Text>;
    }

    if (item.type === "habit") {
      return (
        <View style={{ marginBottom: SPACING.m }}>
          {renderHabitItem({ item: item.data })}
        </View>
      );
    }

    return null;
  };

  const getItemKey = (item: any, index: number) => {
    if (item.type === "header") return `header-${item.title}`;
    if (item.type === "empty") return `empty-${index}`;
    if (item.type === "habit") return item.data._id;
    return `item-${index}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <FlatList
        data={flattenedData}
        renderItem={renderFlatListItem}
        keyExtractor={getItemKey}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <PendingSubmissionsBanner />
          </>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={21}
      />

      {/* Floating Action Button for Adding */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateHabit")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: SPACING.m,
  },
  headerContainer: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.l,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  date: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontWeight: "500",
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "bold",
    letterSpacing: 1.2,
    marginBottom: SPACING.m,
    textTransform: "uppercase",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginRight: SPACING.m,
  },
  active: {
    backgroundColor: COLORS.primary,
  },
  inactive: {
    backgroundColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  streakText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardRight: {
    marginLeft: SPACING.m,
  },
  proveBtn: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.m,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  proveBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  fab: {
    position: "absolute",
    bottom: SPACING.l,
    right: SPACING.l,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100, // Ensure above content
  },
  fabText: {
    fontSize: 32,
    color: "#FFF",
    marginTop: -4, // Optical center
  },
  usageContainer: {
    marginTop: SPACING.m,
    padding: SPACING.m,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.s,
  },
  usageText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  usageCount: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  limitReached: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "bold",
  },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

export default HomeScreen;
