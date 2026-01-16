import { Request, Response } from "express";
import Submission from "../models/Submission";

// @desc    Get submissions for a specific habit
// @route   GET /api/submissions/:habitId
// @access  Public
export const getHabitSubmissions = async (req: Request, res: Response) => {
  try {
    const { habitId } = req.params;

    const submissions = await Submission.find({ habitId }).sort({
      timestamp: -1,
    }); // Newest first

    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
