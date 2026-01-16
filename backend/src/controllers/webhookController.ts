import { Request, Response } from "express";
import User from "../models/User";

// @desc    Handle RevenueCat Webhooks
// @route   POST /api/webhooks/revenuecat
// @access  Public (Protected by Header Secret in production)
export const handleRevenueCatWebhook = async (req: Request, res: Response) => {
  try {
    const { event } = req.body;
    const authHeader = req.headers.authorization;
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    // Verify Secret if configured (Critical for Production)
    if (webhookSecret) {
      // RevenueCat/Stripe often send just the key or "Bearer <key>"
      if (
        !authHeader ||
        (authHeader !== webhookSecret &&
          authHeader !== `Bearer ${webhookSecret}`)
      ) {
        console.warn("Webhook Unauthorized: Invalid or missing secret");
        return res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      console.warn("REVENUECAT_WEBHOOK_SECRET not set. Webhook is vulnerable.");
    }

    if (!event) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const { type, app_user_id } = event;

    // Log the event for debugging
    console.log(`RevenueCat Webhook: ${type} for user ${app_user_id}`);

    // Find user by ID (RevenueCat app_user_id should match our MongoDB _id)
    const user = await User.findById(app_user_id);

    if (!user) {
      console.error(`User not found for ID: ${app_user_id}`);
      return res.status(404).json({ message: "User not found" });
    }

    // Handle Event Types
    switch (type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
        user.plan = "pro";
        await user.save();
        console.log(`User ${user.name} upgraded to PRO`);
        break;

      case "CANCELLATION":
      case "EXPIRATION":
      case "BILLING_ISSUE":
        user.plan = "free";
        await user.save();
        console.log(`User ${user.name} downgraded to FREE`);
        break;

      case "TEST":
        console.log("RevenueCat Test Webhook received");
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    res.status(200).send("Webhook received");
  } catch (error: any) {
    console.error("Webhook Error:", error);
    res.status(500).json({ message: error.message });
  }
};
