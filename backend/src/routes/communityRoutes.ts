import express from "express";
import {
  getCommunityFeed,
  toggleLike,
  addComment,
  getComments,
  reportSubmission,
  blockUser,
} from "../controllers/communityController";
import { protect } from "../middleware/authMiddleware";
import { communityLimiter } from "../middleware/rateLimiters";

const router = express.Router();

// Public routes
router.get("/feed", getCommunityFeed);
router.get("/:submissionId/comments", getComments);

// Protected routes (require authentication)
router.post("/:submissionId/like", communityLimiter, protect, toggleLike);
router.post("/:submissionId/comment", communityLimiter, protect, addComment);
router.post(
  "/:submissionId/report",
  communityLimiter,
  protect,
  reportSubmission
);
router.post("/block/:userId", communityLimiter, protect, blockUser);

export default router;
