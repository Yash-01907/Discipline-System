import express from "express";
import {
  getHabitSubmissions,
  appealSubmission,
  getAppealedSubmissions,
} from "../controllers/submissionController";
import { protect } from "../middleware/authMiddleware";
import { submissionLimiter } from "../middleware/rateLimiters";

const router = express.Router();

// Get all appealed submissions (for review/admin)
router.get("/appeals/list", protect, getAppealedSubmissions);

// Appeal a rejected submission
router.post(
  "/:submissionId/appeal",
  submissionLimiter,
  protect,
  appealSubmission
);

// Get submissions for a habit
router.get("/:habitId", protect, getHabitSubmissions);

export default router;
