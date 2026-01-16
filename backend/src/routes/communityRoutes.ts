import express from "express";
import {
  getCommunityFeed,
  toggleLike,
  addComment,
  getComments,
} from "../controllers/communityController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Public routes
router.get("/feed", getCommunityFeed);
router.get("/:submissionId/comments", getComments);

// Protected routes (require authentication)
router.post("/:submissionId/like", protect, toggleLike);
router.post("/:submissionId/comment", protect, addComment);

export default router;
