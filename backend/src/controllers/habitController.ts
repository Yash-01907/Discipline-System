import { Request, Response } from "express";
import { toZonedTime } from "date-fns-tz";
import { differenceInCalendarDays } from "date-fns";
import Habit from "../models/Habit";
import "../types/express"; // Extend Express Request with user

// @desc    Get all habits
// @route   GET /api/habits
// @access  Private
export const getHabits = async (req: Request, res: Response) => {
  try {
    const habits = await Habit.find({ user: req.user!._id }).sort({
      createdAt: -1,
    });

    const userTimezone = (req.headers["x-timezone"] as string) || "UTC";
    const now = new Date(); // Server time (UTC)
    const userNow = toZonedTime(now, userTimezone);

    for (const habit of habits) {
      // 1. Lazy Streak Update: Check if already processed today (in User's Timezone)
      if (habit.lastStreakCheck) {
        const userLastCheck = toZonedTime(habit.lastStreakCheck, userTimezone);
        if (differenceInCalendarDays(userNow, userLastCheck) === 0) {
          continue; // Already checked today for this user
        }
      }

      // Skip if no streak to reset or one-time goals
      if (habit.currentStreak === 0 || habit.type === "one-time") {
        continue;
      }

      // Get the last completed date
      const completedDates = habit.completedDates;
      if (!completedDates || completedDates.length === 0) {
        continue;
      }

      const lastCompletedDate = completedDates[completedDates.length - 1];
      const userLastCompletedDate = toZonedTime(
        lastCompletedDate,
        userTimezone
      );

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

      await habit.save();
    }

    res.json(habits);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Private
export const createHabit = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      frequency,
      type,
      targetDate,
      strictness,
      isPublic,
    } = req.body;

    const habit = await Habit.create({
      user: req.user!._id,
      title,
      description,
      frequency,
      type,
      targetDate,
      strictness: strictness || "medium",
      isPublic: isPublic || false,
    });

    res.status(201).json(habit);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
