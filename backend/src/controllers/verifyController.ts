import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { verifyImageWithGemini } from "../utils/gemini";
import Submission from "../models/Submission";
import Habit from "../models/Habit";
import fs from "fs";

// @desc    Verify habit with AI
// @route   POST /api/verify
// @access  Public
export const verifySubmission = async (req: Request, res: Response) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, feedback: "No image uploaded" });
  }

  const { habitId } = req.body;

  try {
    // 1. Find Habit
    const habit = await Habit.findById(habitId);
    if (!habit) {
      // Cleanup
      fs.unlinkSync(req.file.path);
      return res
        .status(404)
        .json({ success: false, feedback: "Habit not found" });
    }

    // 2. Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "verihabit",
    });
    const imageUrl = result.secure_url;

    // 3. Gemini Verification
    // We use the local file path for Gemini analysis as it's efficient
    const verification = await verifyImageWithGemini(
      req.file.path,
      habit.title,
      req.file.mimetype
    );

    // 4. Cleanup local file
    fs.unlinkSync(req.file.path);

    // 5. Handle Outcome
    if (verification.verified) {
      // Update streak
      habit.currentStreak += 1;
      habit.completedDates.push(new Date()); // Track date
      await habit.save();
    } else {
      // Reset streak? or just don't increment.
      // User requirement: "If verified: false: Return the reason to the user and reject the submission."
      // It doesn't say reset streak.
    }

    // 6. Log Submission
    await Submission.create({
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      feedback: "Server Validation Error: " + error.message,
    });
  }
};
