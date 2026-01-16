import { Request, Response, NextFunction } from "express";
import Submission from "../models/Submission";

export const checkVerificationLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  // Ensure user exists (should be handled by protect middleware, but safe to check)
  if (!user) {
    return res.status(401).json({ success: false, feedback: "Not authorized" });
  }

  if (user.plan === "free") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyCount = await Submission.countDocuments({
      user: user._id,
      aiVerificationResult: true,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (dailyCount >= 3) {
      return res.status(403).json({
        success: false,
        feedback:
          "Daily Limit Reached (3/3). Upgrade to Pro for unlimited verifications.",
      });
    }
  }

  next();
};
