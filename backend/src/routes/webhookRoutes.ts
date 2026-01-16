import express from "express";
import { handleRevenueCatWebhook } from "../controllers/webhookController";

const router = express.Router();

router.post("/revenuecat", handleRevenueCatWebhook);

export default router;
