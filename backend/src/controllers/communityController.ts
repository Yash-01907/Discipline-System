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
// @route   GET /api/community/feed?cursor=<timestamp>&limit=<number>
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

    // Pagination parameters
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string; // Format: "timestamp_id"

    // Build initial match conditions
    // Include submissions that are either:
    // 1. AI-verified (aiVerificationResult: true), OR
    // 2. Admin-approved after appeal (appealStatus: "approved")
    const matchConditions: any = {
      $or: [{ aiVerificationResult: true }, { appealStatus: "approved" }],
      user: {
        $ne: null,
        $nin: blockedUsers.map((id) => new mongoose.Types.ObjectId(id)),
      },
      isFlagged: false,
    };

    // Add cursor-based filtering (keyset pagination with timestamp + _id)
    // This prevents skipped/duplicate items when posts have identical timestamps
    if (cursor) {
      const [cursorTime, cursorId] = cursor.split("_");

      if (cursorTime && cursorId) {
        // Get posts that are either:
        // 1. Older than cursor timestamp, OR
        // 2. Same timestamp but with smaller _id (for deterministic ordering)
        matchConditions.$and = [
          {
            $or: [
              { createdAt: { $lt: new Date(cursorTime) } },
              {
                createdAt: new Date(cursorTime),
                _id: { $lt: new mongoose.Types.ObjectId(cursorId) },
              },
            ],
          },
        ];
      }
    }

    // 1. Aggregation Pipeline
    const pipeline: any[] = [
      {
        $match: matchConditions,
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
      { $limit: limit + 1 }, // Fetch one extra to determine if there are more results
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
      // OPTIMIZED: Only lookup to check if *current user* liked it
      // We do NOT fetch all likes, just check for the current user's like
      {
        $lookup: {
          from: "likes",
          let: { submissionId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$submission", "$$submissionId"] },
                    {
                      $eq: [
                        "$user",
                        currentUserId
                          ? new mongoose.Types.ObjectId(currentUserId)
                          : null,
                      ],
                    },
                  ],
                },
              },
            },
            { $limit: 1 }, // Only need to know if one exists
          ],
          as: "myLike",
        },
      },
      // Add isLiked based on whether myLike array has any items
      {
        $addFields: {
          isLiked: { $gt: [{ $size: "$myLike" }, 0] },
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

    const results = await Submission.aggregate(pipeline);

    // Check if there are more results
    const hasMore = results.length > limit;
    const feed = hasMore ? results.slice(0, limit) : results;

    // Determine next cursor (timestamp_id of last item for keyset pagination)
    let nextCursor: string | null = null;
    if (hasMore && feed.length > 0) {
      const lastItem = feed[feed.length - 1];
      // Combine timestamp and ID for unique, deterministic cursor
      nextCursor = `${lastItem.createdAt.toISOString()}_${lastItem._id}`;
    }

    // Map _id to string if needed by frontend (Agg gives ObjectIds, res.json usually handles it but good to be safe)
    // Also rename createdAt to timestamp to match frontend expectation
    const formattedFeed = feed.map((item) => ({
      ...item,
      timestamp: item.createdAt,
    }));

    res.json({
      data: formattedFeed,
      nextCursor,
      hasMore,
    });
  } catch (error: any) {
    console.error("Community Feed Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike a submission
// @route   POST /api/community/:submissionId/like
// @access  Private
export const toggleLike = async (req: Request, res: Response) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { submissionId } = req.params;
    const userId = req.user!._id;

    // Check if submission exists
    const submission = await Submission.findById(submissionId).session(session);
    if (!submission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Submission not found" });
    }

    // Check if user already liked this submission
    const existingLike = await Like.findOne({
      user: userId,
      submission: submissionId as any,
    }).session(session);

    let isLiked: boolean;
    let likeCount: number;

    if (existingLike) {
      // Unlike - remove the like and decrement count atomically
      await Like.deleteOne({ _id: existingLike._id }).session(session);
      const updated = await Submission.findByIdAndUpdate(
        submissionId,
        { $inc: { likeCount: -1 } },
        { new: true, session }
      );
      isLiked = false;
      likeCount = Math.max(0, updated?.likeCount || 0);
    } else {
      // Like - add new like and increment count atomically
      await Like.create(
        [
          {
            user: userId,
            submission: submissionId as any,
          },
        ],
        { session }
      );
      const updated = await Submission.findByIdAndUpdate(
        submissionId,
        { $inc: { likeCount: 1 } },
        { new: true, session }
      );
      isLiked = true;
      likeCount = updated?.likeCount || 1;
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      isLiked,
      likeCount,
    });
  } catch (error: any) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();
    console.error("Toggle Like Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment to a submission
// @route   POST /api/community/:submissionId/comment
// @access  Private
export const addComment = async (req: Request, res: Response) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { submissionId } = req.params;
    const { text } = req.body;
    const userId = req.user!._id;

    // Validate text
    if (!text || text.trim().length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Comment text is required" });
    }

    if (text.length > 500) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Comment must be 500 characters or less" });
    }

    // Check if submission exists
    const submission = await Submission.findById(submissionId).session(session);
    if (!submission) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Submission not found" });
    }

    // Create comment and increment denormalized count atomically
    const [comment] = await Comment.create(
      [
        {
          user: userId,
          submission: submissionId as any,
          text: text.trim(),
        },
      ],
      { session }
    );

    // Populate user info for response
    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "name")
      .session(session);

    // Increment denormalized comment count
    const updated = await Submission.findByIdAndUpdate(
      submissionId,
      { $inc: { commentCount: 1 } },
      { new: true, session }
    );

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      comment: {
        _id: populatedComment!._id,
        text: populatedComment!.text,
        userName: (populatedComment!.user as any)?.name || "Anonymous",
        createdAt: populatedComment!.createdAt,
      },
      commentCount: updated?.commentCount || 1,
    });
  } catch (error: any) {
    // Rollback on error
    await session.abortTransaction();
    session.endSession();
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
