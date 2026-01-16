import { Request, Response } from "express";
import Submission from "../models/Submission";
import Habit from "../models/Habit";
import Like from "../models/Like";
import Comment from "../models/Comment";
import User from "../models/User";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { env } from "../config/env";

// @desc    Get public community feed
// @route   GET /api/community/feed
// @access  Public (anyone can view the feed)
export const getCommunityFeed = async (req: Request, res: Response) => {
  try {
    // Get current user ID if authenticated (optional)
    let currentUser = req.user;

    // Manual Token Check if not populated (since route is public)
    if (
      !currentUser &&
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded: any = jwt.verify(token, env.JWT_SECRET);
        currentUser = await User.findById(decoded.id).select("blockedUsers");
      } catch (e) {
        // invalid token, ignore (treat as guest)
      }
    }

    const currentUserId = currentUser?._id;
    let blockedUsers: any[] = [];

    if (currentUser && currentUser.blockedUsers) {
      blockedUsers = currentUser.blockedUsers;
    }

    // 1. Aggregation Pipeline
    const pipeline: any[] = [
      {
        $match: {
          aiVerificationResult: true,
          user: {
            $ne: null,
            $nin: blockedUsers.map((id) => new mongoose.Types.ObjectId(id)),
          },
          isFlagged: false,
        },
      },
      // Lookup Habit to check visibility
      {
        $lookup: {
          from: "habits",
          localField: "habitId",
          foreignField: "_id",
          as: "habitDetails",
        },
      },
      {
        $unwind: "$habitDetails",
      },
      // Filter for Public Habits Only
      {
        $match: {
          "habitDetails.isPublic": true,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      // Lookup User Details
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: false, // Filter out if user doesn't exist
        },
      },
      // Lookup Likes ONLY for isLiked check (not for counting)
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "submission",
          as: "likes",
        },
      },
      // Add isLiked (use denormalized likeCount/commentCount from document)
      {
        $addFields: {
          isLiked: {
            $in: [
              currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null,
              "$likes.user",
            ],
          },
        },
      },
      // Project final shape
      {
        $project: {
          _id: 1,
          imageUrl: 1,
          aiFeedback: 1,
          hashtag: 1, // Optional if you have it
          createdAt: 1,
          habitTitle: "$habitDetails.title",
          habitDescription: "$habitDetails.description",
          userName: "$userDetails.name",
          userId: "$userDetails._id",
          likeCount: 1, // Denormalized field
          commentCount: 1, // Denormalized field
          isLiked: 1,
        },
      },
    ];

    const feed = await Submission.aggregate(pipeline);

    // Map _id to string if needed by frontend (Agg gives ObjectIds, res.json usually handles it but good to be safe)
    // Also rename createdAt to timestamp to match frontend expectation
    const formattedFeed = feed.map((item) => ({
      ...item,
      timestamp: item.createdAt,
    }));

    res.json(formattedFeed);
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
    const userId = req.user!._id;

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
      // Unlike - remove the like and decrement count
      await Like.deleteOne({ _id: existingLike._id });
      const updated = await Submission.findByIdAndUpdate(
        submissionId,
        { $inc: { likeCount: -1 } },
        { new: true }
      );
      isLiked = false;
      likeCount = Math.max(0, updated?.likeCount || 0);
    } else {
      // Like - add new like and increment count
      await Like.create({
        user: userId,
        submission: submissionId as any,
      });
      const updated = await Submission.findByIdAndUpdate(
        submissionId,
        { $inc: { likeCount: 1 } },
        { new: true }
      );
      isLiked = true;
      likeCount = updated?.likeCount || 1;
    }

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
    const userId = req.user!._id;

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

    // Create comment and increment denormalized count
    const comment = await Comment.create({
      user: userId,
      submission: submissionId as any,
      text: text.trim(),
    });

    // Populate user info for response
    const populatedComment = await (comment as any).populate("user", "name");

    // Increment denormalized comment count
    const updated = await Submission.findByIdAndUpdate(
      submissionId,
      { $inc: { commentCount: 1 } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      comment: {
        _id: populatedComment._id,
        text: populatedComment.text,
        userName: (populatedComment.user as any)?.name || "Anonymous",
        createdAt: populatedComment.createdAt,
      },
      commentCount: updated?.commentCount || 1,
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
      .populate("user", "name")
      .lean();

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

// @desc    Report a submission
// @route   POST /api/community/:submissionId/report
// @access  Private
export const reportSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;

    await Submission.findByIdAndUpdate(submissionId, { isFlagged: true });

    res.status(200).json({ success: true, message: "Submission reported" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block a user
// @route   POST /api/community/block/:userId
// @access  Private
export const blockUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params; // ID of user to block
    const currentUserId = req.user!._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    // Add to blockedUsers array if not already present
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: userId },
    });

    res.status(200).json({ success: true, message: "User blocked" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
