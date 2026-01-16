import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { verifyImageWithGemini } from "../utils/gemini";
import Submission from "../models/Submission";
import Habit from "../models/Habit";
import fs from "fs";
import { checkAndResetStreak } from "../utils/streakUtils";
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
  // user is already available in req.user

  try {
    // 1. Find Habit (and ensure ownership)
    const habit = await Habit.findOne({
      _id: habitId,
      user: req.user!._id,
    });
    if (!habit) {
      return res.status(404).json({
        success: false,
        feedback: "Habit not found or not authorized",
      });
    }

    // Lazy Streak Update (Prevent Infinite Streak Exploit)
    const userTimezone = (req.headers["x-timezone"] as string) || "UTC";
    await checkAndResetStreak(habit, userTimezone);

    // 2. Gemini Verification First (Local File)
    const verification = await verifyImageWithGemini(
      req.file.path,
      {
        title: habit.title,
        description: habit.description,
        strictness: habit.strictness as "low" | "medium" | "high",
      },
      req.file.mimetype
    );

    // 3. Upload to Cloudinary (Categorized)
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: verification.verified
        ? "verihabit/verified"
        : "verihabit/rejected",
      tags: verification.verified ? [] : ["rejected", "auto_delete"],
    });
    const imageUrl = result.secure_url;

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
    const submission = await Submission.create({
      user: req.user!._id,
      habitId,
      imageUrl,
      aiVerificationResult: verification.verified,
      aiFeedback: verification.reason,
    });

    res.json({
      success: verification.verified,
      feedback: verification.reason,
      streak: habit.currentStreak,
      submissionId: submission._id, // Return for appeal functionality
    });
  } catch (error: any) {
    console.error(error);

    if (error.message === "SERVICE_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        feedback: "AI service temporarily unavailable. Please try again later.",
      });
    }

    res.status(500).json({
      success: false,
      feedback: "Server Validation Error: " + error.message,
    });
  } finally {
    // Ensure local file is always deleted asynchronously
    if (req.file) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (err) {
        // Ignore errors (e.g. file already deleted or not found)
        console.error("Error cleaning up file:", err);
      }
    }
  }
};
