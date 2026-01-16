import { Request, Response } from "express";
import Submission from "../models/Submission";
import "../types/express"; // Extend Express Request with user

// @desc    Get submissions for a specific habit
// @route   GET /api/submissions/:habitId
// @access  Private
export const getHabitSubmissions = async (req: Request, res: Response) => {
  try {
    const { habitId } = req.params;

    // Ensure the submission belongs to the user
    // We cast habitId to any because Mongoose can handle string->ObjectId, and explicit filter ensures scoping
    const submissions = await Submission.find({
      habitId: habitId,
      user: req.user!._id,
    })
      .sort({
        timestamp: -1,
      })
      .lean();

    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Appeal a rejected submission
// @route   POST /api/submissions/:submissionId/appeal
// @access  Private
export const appealSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { reason } = req.body;
    const userId = req.user!._id;

    // Find the submission
    const submission = await Submission.findById(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Check ownership
    if (submission.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to appeal this submission",
      });
    }

    // Check if already verified (can't appeal a success)
    if (submission.aiVerificationResult === true) {
      return res.status(400).json({
        success: false,
        message: "Cannot appeal a verified submission",
      });
    }

    // Check if already appealed
    if (submission.isAppealed) {
      return res.status(400).json({
        success: false,
        message: "This submission has already been appealed",
        appealStatus: submission.appealStatus,
      });
    }

    // Flag the submission as appealed
    submission.isAppealed = true;
    submission.appealReason =
      reason || "User believes this was incorrectly rejected";
    submission.appealedAt = new Date();
    submission.appealStatus = "pending";

    await submission.save();

    console.log(`Submission ${submissionId} flagged for appeal review`);

    res.json({
      success: true,
      message:
        "Your appeal has been submitted for review. We'll look into this to improve our AI.",
      submissionId: submission._id,
      appealStatus: submission.appealStatus,
    });
  } catch (error: any) {
    console.error("Appeal Submission Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all appealed submissions (Admin/Review endpoint)
// @route   GET /api/submissions/appeals
// @access  Private (should be admin only in production)
export const getAppealedSubmissions = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || "pending";
    const limit = parseInt(req.query.limit as string) || 50;

    const submissions = await Submission.find({
      isAppealed: true,
      appealStatus: status as "none" | "pending" | "approved" | "rejected",
    })
      .sort({ appealedAt: -1 })
      .limit(limit)
      .populate("habitId", "title description")
      .populate("user", "name")
      .lean();

    res.json(submissions);
  } catch (error: any) {
    console.error("Get Appeals Error:", error);
    res.status(500).json({ message: error.message });
  }
};
