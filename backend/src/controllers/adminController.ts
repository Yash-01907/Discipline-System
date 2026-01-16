import { Request, Response } from "express";
import Submission from "../models/Submission";
import mongoose from "mongoose";

// @desc    Get all flagged reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
export const getFlaggedSubmissions = async (req: Request, res: Response) => {
  try {
    const reports = await Submission.find({ isFlagged: true })
      .populate("user", "name email")
      .populate("habitId", "title string") // Assuming Habit model has title
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error: any) {
    console.error("Admin Reports Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Review an appealed submission (approve or reject)
// @route   POST /api/admin/appeals/:submissionId/review
// @access  Private (Admin)
export const reviewAppeal = async (req: Request, res: Response) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { submissionId } = req.params;
    const { decision, adminNotes } = req.body; // decision: "approved" | "rejected"

    // Validate decision
    if (!decision || !["approved", "rejected"].includes(decision)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Decision must be either "approved" or "rejected"',
      });
    }

    // Find the submission
    const submission = await Submission.findById(submissionId).session(session);

    if (!submission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Check if it's actually appealed
    if (!submission.isAppealed || submission.appealStatus !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "This submission is not pending appeal review",
        currentStatus: submission.appealStatus,
      });
    }

    // Update appeal status
    submission.appealStatus = decision as "approved" | "rejected";

    // Store admin notes if provided
    // Note: We do NOT update aiVerificationResult to preserve AI accuracy data
    // The feed query uses $or to show both AI-approved and admin-approved posts
    if (adminNotes) {
      submission.aiFeedback = `[Admin ${
        decision === "approved" ? "Approved" : "Rejected"
      }] ${adminNotes}`;
    }

    await submission.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log(
      `Appeal ${decision} for submission ${submissionId} by admin ${req.user?._id}`
    );

    res.json({
      success: true,
      message: `Appeal ${decision} successfully`,
      submission: {
        _id: submission._id,
        appealStatus: submission.appealStatus,
        aiVerificationResult: submission.aiVerificationResult,
      },
    });
  } catch (error: any) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();
    console.error("Review Appeal Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
