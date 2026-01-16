import { Request, Response } from "express";
import Habit from "../models/Habit";

// @desc    Get all habits
// @route   GET /api/habits
// @access  Public (for MVP)
export const getHabits = async (req: Request, res: Response) => {
  try {
    const habits = await Habit.find().sort({ createdAt: -1 });
    res.json(habits);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Public (for MVP)
export const createHabit = async (req: Request, res: Response) => {
  try {
    const { title, description, frequency, type, targetDate } = req.body;

    const habit = await Habit.create({
      title,
      description,
      frequency,
      type,
      targetDate,
    });

    res.status(201).json(habit);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
