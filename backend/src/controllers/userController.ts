import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Habit from "../models/Habit";
import Like from "../models/Like";
import Comment from "../models/Comment";
import Submission from "../models/Submission";
import {
  registerUserSchema,
  loginUserSchema,
} from "../schemas/validationSchemas";
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
  const validation = registerUserSchema.safeParse(req.body);

  if (!validation.success) {
    const errorMessage = validation.error.issues[0].message;
    res.status(400).json({ message: errorMessage });
    return;
  }

  const { name, email, password } = validation.data;

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
  const validation = loginUserSchema.safeParse(req.body);

  if (!validation.success) {
    const errorMessage = validation.error.issues[0].message;
    // Don't return strict validation errors for login mostly for security (user enum check etc), but basic format is ok
    // Actually generic "Invalid credentials" is better security practice but Zod ensures we are working with string fields which is good.
    // I'll return specific validation error (like empty field) for UX, but credentials check happens later.
    return res.status(400).json({ message: errorMessage });
  }

  const { email, password } = validation.data;

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
    const stats = await Habit.aggregate([
      { $match: { user: req.user!._id } },
      {
        $group: {
          _id: null,
          totalHabits: { $sum: 1 },
          totalCompleted: { $sum: { $size: "$completedDates" } },
          globalStreak: { $sum: "$currentStreak" },
        },
      },
    ]);

    const totalHabits = stats.length > 0 ? stats[0].totalHabits : 0;
    const totalCompleted = stats.length > 0 ? stats[0].totalCompleted : 0;
    const globalStreak = stats.length > 0 ? stats[0].globalStreak : 0;

    const score = Math.min(
      100,
      Math.round(globalStreak * 5 + totalCompleted * 2)
    ); // Gamified score

    // Calculate daily usage for rate limiting display
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Use the model directly.

    const dailyVerifications = await Submission.countDocuments({
      user: req.user!._id,
      aiVerificationResult: true,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // cast to any for plan property
    const userPlan = req.user!.plan || "free";
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
    const userId = req.user!._id;

    // Delete related data first

    // 0. Find User's Submissions to cascade delete interactions on them
    const userSubmissions = await Submission.find({ user: userId });
    const submissionIds = userSubmissions.map((s) => s._id);

    // Delete Likes & Comments ON these submissions (made by others)
    await Like.deleteMany({ submission: { $in: submissionIds } });
    await Comment.deleteMany({ submission: { $in: submissionIds } });

    // 1. Delete Submissions
    await Submission.deleteMany({ user: userId });

    // 2. Delete Habits
    await Habit.deleteMany({ user: userId });

    // 3. Delete Interactions (Likes & Comments)
    await Like.deleteMany({ user: userId });
    await Comment.deleteMany({ user: userId });

    // 4. Delete User
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
