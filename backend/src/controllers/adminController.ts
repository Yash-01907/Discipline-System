import { Request, Response } from "express";
import Submission from "../models/Submission";

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
