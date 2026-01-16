import { Request, Response } from "express";
import Submission from "../models/Submission";
import Habit from "../models/Habit";

// @desc    Get public community feed
// @route   GET /api/community/feed
// @access  Public (anyone can view the feed)
export const getCommunityFeed = async (req: Request, res: Response) => {
  try {
    // 1. Find all public habits
    const publicHabits = await Habit.find({ isPublic: true }).select("_id");
    const publicHabitIds = publicHabits.map((h) => h._id);

    // 2. Find verified submissions for those habits
    const submissions = await Submission.find({
      habitId: { $in: publicHabitIds } as any,
      aiVerificationResult: true,
    })
      .sort({ createdAt: -1 })
      .limit(50) // Limit feed size
      .populate("habitId", "title description") // Get habit title
      .populate("user", "name"); // Get user name

    // 3. Format response
    const feed = submissions.map((sub: any) => ({
      _id: sub._id,
      imageUrl: sub.imageUrl,
      habitTitle: sub.habitId?.title || "Unknown Habit",
      habitDescription: sub.habitId?.description || "",
      userName: sub.user?.name || "Anonymous",
      aiFeedback: sub.aiFeedback,
      timestamp: sub.createdAt,
    }));

    res.json(feed);
  } catch (error: any) {
    console.error("Community Feed Error:", error);
    res.status(500).json({ message: error.message });
  }
};
