import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useHabits } from "../hooks/useHabits";
import { Calendar } from "react-native-calendars";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const CalendarScreen = () => {
  const { data: habits } = useHabits();

  const markedDates = useMemo(() => {
    if (!habits) return {};

    // Logic: Identify dates where ALL active habits were completed
    // 1. Collect all unique dates from all habits' activity
    // Simpler MVP approach: Just look at the last 30 days
    const result: any = {};
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      // Find habits active on this day (created before or on this day)
      // AND are recurring (One-time habits might count differently, but let's assume recurring for streak)
      const activeHabits = habits.filter(
        (h) => h.type === "recurring" && new Date(h.createdAt) <= d
      );

      if (activeHabits.length === 0) continue;

      const completedCount = activeHabits.filter(
        (h) =>
          h.completedDates &&
          h.completedDates.some((cd) => cd.toString().split("T")[0] === dateStr)
      ).length;

      if (completedCount === activeHabits.length && activeHabits.length > 0) {
        result[dateStr] = {
          marked: true,
          selected: true,
          selectedColor: "transparent",
          selectedTextColor: COLORS.text,
          dotColor: "transparent",
          customStyles: {
            container: {
              backgroundColor: COLORS.secondary,
              borderRadius: 8,
            },
            text: {
              color: "#FFF",
              fontWeight: "bold",
            },
          },
        };
      }
    }
    return result;
  }, [habits]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Consistency Log</Text>
      <View style={styles.calendarContainer}>
        <Calendar
          // Current month
          current={new Date().toISOString().split("T")[0]}
          onDayPress={(day) => {
            console.log("selected day", day);
          }}
          monthFormat={"MMMM yyyy"}
          hideExtraDays={true}
          firstDay={1}
          hideDayNames={false}
          showWeekNumbers={false}
          onPressArrowLeft={(subtractMonth) => subtractMonth()}
          onPressArrowRight={(addMonth) => addMonth()}
          disableAllTouchEventsForDisabledDays={true}
          enableSwipeMonths={true}
          markingType={"custom"}
          markedDates={markedDates}
          theme={{
            backgroundColor: COLORS.surface,
            calendarBackground: COLORS.surface,
            textSectionTitleColor: COLORS.textSecondary,
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor: "#ffffff",
            todayTextColor: COLORS.primary,
            dayTextColor: COLORS.text,
            textDisabledColor: "#d9e1e8",
            dotColor: COLORS.primary,
            selectedDotColor: "#ffffff",
            arrowColor: COLORS.primary,
            monthTextColor: COLORS.text,
            indicatorColor: COLORS.primary,
            textDayFontFamily: FONTS.regular,
            textMonthFontFamily: FONTS.bold,
            textDayHeaderFontFamily: FONTS.regular,
            textDayFontWeight: "300",
            textMonthFontWeight: "bold",
            textDayHeaderFontWeight: "300",
            textDayFontSize: 16,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 14,
          }}
        />
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.secondary }]} />
          <Text style={styles.legendText}>100% Completion (🔥)</Text>
        </View>
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
  calendarContainer: {
    borderRadius: 16, // Rounded corners
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  legend: {
    marginTop: SPACING.m,
    flexDirection: "row",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.l,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.s,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});

export default CalendarScreen;
