import express from "express";
import { getFlaggedSubmissions } from "../controllers/adminController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/reports", protect, getFlaggedSubmissions);

export default router;
