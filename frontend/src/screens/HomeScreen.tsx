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
import { useHabits } from "../hooks/useHabits";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const HomeScreen = () => {
  // In tab nav, navigation might need type adjustment if jumping stacks, but usually fine.
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { data: habits, isLoading, refetch, isRefetching } = useHabits();

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {renderHeader()}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Today's Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S GOALS</Text>
          {dailyHabits.length === 0 ? (
            <Text style={styles.emptyText}>No goals set for today.</Text>
          ) : (
            dailyHabits.map((habit) => (
              <View key={habit._id} style={{ marginBottom: SPACING.m }}>
                {renderHabitItem({ item: habit })}
              </View>
            ))
          )}
        </View>

        {/* Upcoming Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING GOALS</Text>
          {upcomingHabits.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming one-time goals.</Text>
          ) : (
            upcomingHabits.map((habit) => (
              <View key={habit._id} style={{ marginBottom: SPACING.m }}>
                {renderHabitItem({ item: habit })}
              </View>
            ))
          )}
        </View>

        {/* Spacer for FAB or TabBar */}
        <View style={{ height: 80 }} />
      </ScrollView>

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

// Need ScrollView import modification
import { ScrollView } from "react-native";

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
});

export default HomeScreen;
