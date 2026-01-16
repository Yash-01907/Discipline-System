import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { verifyImageWithGemini } from "../utils/gemini";
import Submission from "../models/Submission";
import Habit from "../models/Habit";
import fs from "fs";
import "../types/express"; // Extend Express Request with user

// @desc    Verify habit with AI
// @route   POST /api/verify
// @access  Private
export const verifySubmission = async (req: Request, res: Response) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, feedback: "No image uploaded" });
  }

  const { habitId } = req.body;

  try {
    // 1. Find Habit (and ensure ownership)
    const habit = await Habit.findOne({
      _id: habitId,
      user: req.user!.id,
    } as any);
    if (!habit) {
      return res.status(404).json({
        success: false,
        feedback: "Habit not found or not authorized",
      });
    }

    // 2. Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "verihabit",
    });
    const imageUrl = result.secure_url;

    // 3. Gemini Verification
    // We use the local file path for Gemini analysis as it's efficient
    // We pass the full habit object (as any to satisfy IHabitContext duck typing)
    const verification = await verifyImageWithGemini(
      req.file.path,
      {
        title: habit.title,
        description: habit.description,
        strictness: habit.strictness as any, // Cast string to union type
      },
      req.file.mimetype
    );

    // 4. Handle Outcome
    if (verification.verified) {
      // Update streak
      habit.currentStreak += 1;
      habit.completedDates.push(new Date()); // Track date
      await habit.save();
    } else {
      // Reset streak? or just don't increment.
    }

    // 6. Log Submission
    await Submission.create({
      user: req.user!.id as any,
      habitId,
      imageUrl,
      aiVerificationResult: verification.verified,
      aiFeedback: verification.reason,
    });

    res.json({
      success: verification.verified,
      feedback: verification.reason,
      streak: habit.currentStreak,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      feedback: "Server Validation Error: " + error.message,
    });
  } finally {
    // Ensure local file is always deleted
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};
