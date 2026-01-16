import express from "express";
import { getHabits, createHabit } from "../controllers/habitController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.route("/").get(protect, getHabits).post(protect, createHabit);

export default router;
