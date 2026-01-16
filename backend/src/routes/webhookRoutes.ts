import express from "express";
import { handleRevenueCatWebhook } from "../controllers/webhookController";
import { webhookLimiter } from "../middleware/rateLimiters";

const router = express.Router();

router.post("/revenuecat", webhookLimiter, handleRevenueCatWebhook);

export default router;
