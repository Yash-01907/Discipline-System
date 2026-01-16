import { Request, Response, NextFunction } from "express";
import { toZonedTime } from "date-fns-tz";
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
    const userTimezone = (req.headers["x-timezone"] as string) || "UTC";
    const now = new Date();

    // Get "User's Midnight" in their timezone
    // toZonedTime returns a Date representing the local time (e.g., 00:00)
    const zonedNow = toZonedTime(now, userTimezone);
    const startOfDayZoned = new Date(zonedNow);
    startOfDayZoned.setHours(0, 0, 0, 0);

    const endOfDayZoned = new Date(startOfDayZoned);
    endOfDayZoned.setDate(endOfDayZoned.getDate() + 1);

    // Convert these "Local Time" instances back to "True UTC" for the database query
    const { fromZonedTime } = require("date-fns-tz");
    const startUtc = fromZonedTime(startOfDayZoned, userTimezone);
    const endUtc = fromZonedTime(endOfDayZoned, userTimezone);

    const dailyCount = await Submission.countDocuments({
      user: user._id,
      // Count ALL submissions (success or fail) to prevent API cost abuse
      createdAt: {
        $gte: startUtc,
        $lt: endUtc,
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
