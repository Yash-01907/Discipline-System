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
      habitId: habitId as any,
      user: req.user!.id as any,
    } as any).sort({
      timestamp: -1,
    });

    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
