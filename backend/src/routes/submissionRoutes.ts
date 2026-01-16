import express from "express";
import { getHabitSubmissions } from "../controllers/submissionController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/:habitId", protect, getHabitSubmissions);

export default router;
