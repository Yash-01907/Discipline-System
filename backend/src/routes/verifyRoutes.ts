import express from "express";
import multer from "multer";
import { verifySubmission } from "../controllers/verifyController";
import { protect } from "../middleware/authMiddleware";
import { checkVerificationLimit } from "../middleware/limitMiddleware";
import { verifyLimiter } from "../middleware/rateLimiters";
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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed (jpeg, jpg, png, webp)!"));
  },
});

router.post(
  "/",
  verifyLimiter,
  protect,
  checkVerificationLimit,
  upload.single("image"),
  verifySubmission
);

export default router;
