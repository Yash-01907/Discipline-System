import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import habitRoutes from "./routes/habitRoutes";
import verifyRoutes from "./routes/verifyRoutes";
import submissionRoutes from "./routes/submissionRoutes";
import userRoutes from "./routes/userRoutes";
import communityRoutes from "./routes/communityRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import adminRoutes from "./routes/adminRoutes";
import path from "path";
import fs from "fs";
import { errorHandler } from "./middleware/errorMiddleware";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Routes
app.use("/api/users", userRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/admin", adminRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("VeriHabit API is running");
});

app.use(errorHandler);

// Database Connection
connectDB();

export default app;
