import express from "express";
import multer from "multer";
import { verifySubmission } from "../controllers/verifyController";
import { protect } from "../middleware/authMiddleware";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/", protect, upload.single("image"), verifySubmission);

export default router;
