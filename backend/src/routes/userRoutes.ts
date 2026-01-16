import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  getUserStats,
  deleteUser,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";
import { authLimiter } from "../middleware/rateLimiters";

const router = express.Router();

router.post("/", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/me", protect, getMe);
router.get("/stats", protect, getUserStats);
router.delete("/me", protect, deleteUser);

export default router;
