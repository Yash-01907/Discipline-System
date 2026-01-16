import { Request, Response } from "express";
import Habit from "../models/Habit";
import "../types/express"; // Extend Express Request with user

// @desc    Get all habits
// @route   GET /api/habits
// @access  Private
export const getHabits = async (req: Request, res: Response) => {
  try {
    const habits = await Habit.find({ user: req.user!.id as any }).sort({
      createdAt: -1,
    });

    // Streak Reset Logic
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    for (const habit of habits) {
      // Skip if no streak to reset or one-time goals
      if (habit.currentStreak === 0 || habit.type === "one-time") {
        continue;
      }

      // Get the last completed date
      const completedDates = habit.completedDates;
      if (!completedDates || completedDates.length === 0) {
        continue;
      }

      const lastCompletedDate = new Date(
        completedDates[completedDates.length - 1]
      );
      const lastCompletedDay = new Date(
        lastCompletedDate.getFullYear(),
        lastCompletedDate.getMonth(),
        lastCompletedDate.getDate()
      );

      // Calculate days since last completion
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysSinceLastCompletion = Math.floor(
        (startOfToday.getTime() - lastCompletedDay.getTime()) / msPerDay
      );

      let shouldReset = false;

      if (habit.frequency === "Daily") {
        // Daily habits: Reset if more than 1 day has passed (missed yesterday)
        if (daysSinceLastCompletion > 1) {
          shouldReset = true;
        }
      } else if (habit.frequency === "Weekly") {
        // Weekly habits: Reset if more than 7 days have passed
        if (daysSinceLastCompletion > 7) {
          shouldReset = true;
        }
      }

      if (shouldReset) {
        habit.currentStreak = 0;
        await habit.save();
        console.log(`Streak reset for habit: ${habit.title}`);
      }
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
      user: req.user!.id as any,
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
