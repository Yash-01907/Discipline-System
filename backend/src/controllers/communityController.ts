import { Request, Response } from "express";
import Submission from "../models/Submission";
import Habit from "../models/Habit";
import Like from "../models/Like";
import Comment from "../models/Comment";

// @desc    Get public community feed
// @route   GET /api/community/feed
// @access  Public (anyone can view the feed)
export const getCommunityFeed = async (req: Request, res: Response) => {
  try {
    // Get current user ID if authenticated (optional)
    const currentUserId = (req as any).user?._id;

    // 1. Find all public habits
    const publicHabits = await Habit.find({ isPublic: true }).select("_id");
    const publicHabitIds = publicHabits.map((h) => h._id);

    // 2. Find verified submissions for those habits
    const submissions = await Submission.find({
      habitId: { $in: publicHabitIds } as any,
      aiVerificationResult: true,
      user: { $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("habitId", "title description")
      .populate("user", "name");

    // 3. Filter out any submissions where populate returned null
    const validSubmissions = submissions.filter(
      (sub: any) => sub.user !== null && sub.habitId !== null
    );

    // 4. Get like counts and comment counts for all submissions
    const submissionIds = validSubmissions.map((s) => s._id);

    const [likeCounts, commentCounts, userLikes] = await Promise.all([
      Like.aggregate([
        { $match: { submission: { $in: submissionIds } } },
        { $group: { _id: "$submission", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { submission: { $in: submissionIds } } },
        { $group: { _id: "$submission", count: { $sum: 1 } } },
      ]),
      currentUserId
        ? Like.find({
            user: currentUserId,
            submission: { $in: submissionIds } as any,
          }).select("submission")
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const likeCountMap = new Map(
      likeCounts.map((l: any) => [l._id.toString(), l.count])
    );
    const commentCountMap = new Map(
      commentCounts.map((c: any) => [c._id.toString(), c.count])
    );
    const userLikedSet = new Set(
      userLikes.map((l: any) => l.submission.toString())
    );

    // 5. Format response with interaction data
    const feed = validSubmissions.map((sub: any) => ({
      _id: sub._id,
      imageUrl: sub.imageUrl,
      habitTitle: sub.habitId?.title || "Unknown Habit",
      habitDescription: sub.habitId?.description || "",
      userName: sub.user?.name || "Anonymous",
      aiFeedback: sub.aiFeedback,
      timestamp: sub.createdAt,
      likeCount: likeCountMap.get(sub._id.toString()) || 0,
      commentCount: commentCountMap.get(sub._id.toString()) || 0,
      isLiked: userLikedSet.has(sub._id.toString()),
    }));

    res.json(feed);
  } catch (error: any) {
    console.error("Community Feed Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike a submission
// @route   POST /api/community/:submissionId/like
// @access  Private
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = (req as any).user._id;

    // Check if submission exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Check if user already liked this submission
    const existingLike = await Like.findOne({
      user: userId,
      submission: submissionId as any,
    });

    let isLiked: boolean;
    let likeCount: number;

    if (existingLike) {
      // Unlike - remove the like
      await Like.deleteOne({ _id: existingLike._id });
      isLiked = false;
    } else {
      // Like - add new like
      await Like.create({
        user: userId,
        submission: submissionId as any,
      });
      isLiked = true;
    }

    // Get updated like count
    likeCount = await Like.countDocuments({ submission: submissionId as any });

    res.json({
      success: true,
      isLiked,
      likeCount,
    });
  } catch (error: any) {
    console.error("Toggle Like Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment to a submission
// @route   POST /api/community/:submissionId/comment
// @access  Private
export const addComment = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { text } = req.body;
    const userId = (req as any).user._id;

    // Validate text
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    if (text.length > 500) {
      return res
        .status(400)
        .json({ message: "Comment must be 500 characters or less" });
    }

    // Check if submission exists
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Create comment
    const comment = await Comment.create({
      user: userId,
      submission: submissionId as any,
      text: text.trim(),
    });

    // Populate user info for response
    const populatedComment = await (comment as any).populate("user", "name");

    // Get updated comment count
    const commentCount = await Comment.countDocuments({
      submission: submissionId as any,
    });

    res.status(201).json({
      success: true,
      comment: {
        _id: populatedComment._id,
        text: populatedComment.text,
        userName: (populatedComment.user as any)?.name || "Anonymous",
        createdAt: populatedComment.createdAt,
      },
      commentCount,
    });
  } catch (error: any) {
    console.error("Add Comment Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get comments for a submission
// @route   GET /api/community/:submissionId/comments
// @access  Public
export const getComments = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    const comments = await Comment.find({ submission: submissionId as any })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name");

    const formattedComments = comments.map((c: any) => ({
      _id: c._id,
      text: c.text,
      userName: c.user?.name || "Anonymous",
      createdAt: c.createdAt,
    }));

    res.json(formattedComments);
  } catch (error: any) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ message: error.message });
  }
};
