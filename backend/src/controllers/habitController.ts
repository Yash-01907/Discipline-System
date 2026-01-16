import { Request, Response } from "express";
import Habit from "../models/Habit";

// @desc    Get all habits
// @route   GET /api/habits
// @access  Private
export const getHabits = async (req: any, res: Response) => {
  try {
    const habits = await Habit.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(habits);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Private
export const createHabit = async (req: any, res: Response) => {
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
      user: req.user.id,
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
