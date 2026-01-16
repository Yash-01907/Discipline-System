import express from "express";
import {
  getHabitSubmissions,
  appealSubmission,
  getAppealedSubmissions,
} from "../controllers/submissionController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

// Get submissions for a habit
router.get("/:habitId", protect, getHabitSubmissions);

// Appeal a rejected submission
router.post("/:submissionId/appeal", protect, appealSubmission);

// Get all appealed submissions (for review/admin)
router.get("/appeals/list", protect, getAppealedSubmissions);

export default router;
