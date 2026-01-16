import { Request, Response } from "express";
import Habit from "../models/Habit";
import { createHabitSchema } from "../schemas/validationSchemas";
import { checkAndResetStreak } from "../utils/streakUtils";
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

    for (const habit of habits) {
      await checkAndResetStreak(habit, userTimezone);
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
    const validation = createHabitSchema.safeParse(req.body);

    if (!validation.success) {
      // Return the first error message for simplicity or full object
      const errorMessage = validation.error.issues[0].message;
      return res.status(400).json({ message: errorMessage });
    }

    const {
      title,
      description,
      frequency,
      type,
      targetDate,
      strictness,
      isPublic,
    } = validation.data;

    const habit = await Habit.create({
      user: req.user!._id,
      title,
      description,
      frequency,
      type,
      targetDate,
      strictness,
      isPublic,
    });

    res.status(201).json(habit);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
