import express from "express";
import { getHabits, createHabit } from "../controllers/habitController";

const router = express.Router();

router.route("/").get(getHabits).post(createHabit);

export default router;
