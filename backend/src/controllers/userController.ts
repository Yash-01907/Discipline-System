import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Habit from "../models/Habit";
import "../types/express"; // Extend Express Request with user

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret_for_dev", {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/users
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ message: "Please add all fields" });
    return;
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400).json({ message: "User already exists" });
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    });
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      token: generateToken(user.id),
    });
  } else {
    res.status(400).json({ message: "Invalid credentials" });
  }
};

// @desc    Get user data
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req: Request, res: Response) => {
  res.status(200).json(req.user);
};

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const habits = await Habit.find({ user: req.user!.id as any });

    const totalHabits = habits.length;
    let totalCompleted = 0;

    // Calculate global streak (simplified logic: max streak of any habit for now, or unified timeline)
    // For MVP, let's sum up total completed completions
    habits.forEach((h) => {
      totalCompleted += h.completedDates.length;
    });

    // Calculate Discipline Score (0-100)
    // Formula: Average consistency across all active habits
    // Or simpler: (Total Completed / (Total Potential Days?)) * 100
    // Let's use a "Momentum Score": Sum of all current streaks * 10 + Verification Quality (future)
    // For now: Sum of all current streaks.
    const globalStreak = habits.reduce((acc, h) => acc + h.currentStreak, 0);

    const score = Math.min(
      100,
      Math.round(globalStreak * 5 + totalCompleted * 2)
    ); // Gamified score

    // Calculate daily usage for rate limiting display
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Dynamic import to avoid circular dependency issues if they exist,
    // or just import at top if clean. Let's use the model directly.
    const Submission = require("../models/Submission").default;

    const dailyVerifications = await Submission.countDocuments({
      user: req.user!.id,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // cast to any for plan property
    const userPlan = (req.user as any).plan || "free";
    const dailyLimit = userPlan === "free" ? 3 : Infinity;

    res.status(200).json({
      totalHabits,
      totalCompleted,
      globalStreak, // Effectively "Total Cumulative Streak" across all habits
      disciplineScore: score,
      usage: {
        plan: userPlan,
        verifiedCount: dailyVerifications,
        limit: dailyLimit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user account and data
// @route   DELETE /api/users/me
// @access  Private
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Delete related data first
    // 1. Delete Submissions
    const Submission = require("../models/Submission").default;
    await Submission.deleteMany({ user: userId });

    // 2. Delete Habits
    await Habit.deleteMany({ user: userId });

    // 3. Delete User
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
