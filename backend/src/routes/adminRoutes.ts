import express from "express";
import {
  getFlaggedSubmissions,
  reviewAppeal,
} from "../controllers/adminController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/reports", protect, getFlaggedSubmissions);
router.post("/appeals/:submissionId/review", protect, reviewAppeal);

export default router;
