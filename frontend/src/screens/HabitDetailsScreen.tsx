import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useHabits } from "../hooks/useHabits";
import { Calendar } from "react-native-calendars";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "HabitDetails">;

const HabitDetailsScreen = ({ route, navigation }: Props) => {
  const { habitId, habitTitle } = route.params;
  const { data: habits, isLoading } = useHabits();

  const habit = useMemo(
    () => habits?.find((h) => h._id === habitId),
    [habits, habitId]
  );

  const markedDates = useMemo(() => {
    if (!habit || !habit.completedDates) return {};

    const result: any = {};
    habit.completedDates.forEach((date) => {
      const dateStr = date.toString().split("T")[0];
      result[dateStr] = {
        selected: true,
        selectedColor: COLORS.success,
        selectedTextColor: "#FFF",
      };
    });
    return result;
  }, [habit]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={styles.center}>
        <Text>Habit not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← </Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {habit.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statValue}>{habit.currentStreak} 🔥</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Completed</Text>
            <Text style={styles.statValue}>
              {habit.completedDates?.length || 0}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>HISTORY LOG</Text>
        <View style={styles.calendarContainer}>
          <Calendar
            markedDates={markedDates}
            theme={{
              backgroundColor: COLORS.surface,
              calendarBackground: COLORS.surface,
              textSectionTitleColor: COLORS.textSecondary,
              selectedDayBackgroundColor: COLORS.success,
              selectedDayTextColor: "#ffffff",
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.text,
              textDisabledColor: "#d9e1e8",
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.text,
              indicatorColor: COLORS.primary,
              textDayFontFamily: FONTS.regular,
              textMonthFontFamily: FONTS.bold,
              textDayHeaderFontFamily: FONTS.regular,
              textDayFontSize: 16,
              textMonthFontSize: 16,
            }}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Description</Text>
          <Text style={styles.infoText}>{habit.description}</Text>

          <View style={styles.separator} />

          <Text style={styles.infoLabel}>Frequency</Text>
          <Text style={styles.infoText}>{habit.frequency}</Text>

          <View style={styles.separator} />

          <Text style={styles.infoLabel}>Started On</Text>
          <Text style={styles.infoText}>
            {new Date(habit.createdAt).toDateString()}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => navigation.navigate("Verify", { habitId, habitTitle })}
        >
          <Text style={styles.verifyButtonText}>VERIFY NOW</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.m,
    paddingBottom: SPACING.l,
  },
  backButton: {
    paddingRight: SPACING.m,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
    fontFamily: FONTS.bold,
  },
  content: {
    padding: SPACING.m,
  },
  statRow: {
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
    letterSpacing: 1,
  },
  calendarContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: SPACING.l,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderRadius: 16,
    marginBottom: SPACING.l,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.m,
  },
  footerContainer: {
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default HabitDetailsScreen;
