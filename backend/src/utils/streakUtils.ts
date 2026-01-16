import { toZonedTime } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";
import { IHabit } from "../models/Habit";

/**
 * Checks if a habit's streak should be reset based on the user's timezone.
 * Modifies the habit object and saves it if a change occurs.
 *
 * @param habit The Mongoose Habit document
 * @param userTimezone The user's timezone string (e.g., "America/New_York")
 * @returns boolean True if the habit was modified and saved, False otherwise
 */
export const checkAndResetStreak = async (
  habit: IHabit,
  userTimezone: string = "UTC"
): Promise<boolean> => {
  const now = new Date(); // Server time (UTC)
  const userNow = toZonedTime(now, userTimezone);

  // 1. Lazy Streak Update: Check if already processed today (in User's Timezone)
  if (habit.lastStreakCheck) {
    const userLastCheck = toZonedTime(habit.lastStreakCheck, userTimezone);
    if (differenceInCalendarDays(userNow, userLastCheck) === 0) {
      return false; // Already checked today for this user
    }
  }

  // Skip if no streak to reset or one-time goals
  // If streak is 0, nothing to reset.
  if (habit.currentStreak === 0 || habit.type === "one-time") {
    // Even if we don't reset, should we update lastStreakCheck?
    // The original controller didn't. Consistent behavior is safest.
    return false;
  }

  // Get the last completed date
  const completedDates = habit.completedDates;
  if (!completedDates || completedDates.length === 0) {
    return false;
  }

  const lastCompletedDate = completedDates[completedDates.length - 1];
  const userLastCompletedDate = toZonedTime(lastCompletedDate, userTimezone);

  // Calculate calendar days difference in User's Timezone
  const daysSinceLastCompletion = differenceInCalendarDays(
    userNow,
    userLastCompletedDate
  );

  let shouldReset = false;

  if (habit.frequency === "Daily") {
    // Daily habits: Reset if > 1 day has passed (missed yesterday)
    if (daysSinceLastCompletion > 1) {
      shouldReset = true;
    }
  } else if (habit.frequency === "Weekly") {
    // Weekly habits: Reset if > 7 days have passed
    if (daysSinceLastCompletion > 7) {
      shouldReset = true;
    }
  }

  // Update the check date so we don't run this again today
  habit.lastStreakCheck = now;

  if (shouldReset) {
    habit.currentStreak = 0;
    console.log(`Streak reset for habit: ${habit.title}`);
  }

  // Save if we reset logic ran (which implies we updated lastStreakCheck at minimum)
  await habit.save();
  return true;
};
