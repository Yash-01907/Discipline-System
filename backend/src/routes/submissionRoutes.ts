import express from "express";
import { getHabitSubmissions } from "../controllers/submissionController";

const router = express.Router();

router.get("/:habitId", getHabitSubmissions);

export default router;
