import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  getUserStats,
  deleteUser,
} from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.get("/stats", protect, getUserStats);
router.delete("/me", protect, deleteUser);

export default router;
