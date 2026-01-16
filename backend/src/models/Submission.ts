import mongoose, { Document, Schema } from "mongoose";

export interface ISubmission extends Document {
  user: mongoose.Schema.Types.ObjectId;
  habitId: mongoose.Schema.Types.ObjectId;
  imageUrl: string;
  aiVerificationResult: boolean;
  aiFeedback: string;
  timestamp: Date;
  // Appeal fields
  isAppealed: boolean;
  appealReason?: string;
  appealedAt?: Date;
  appealStatus: "none" | "pending" | "approved" | "rejected";
}

const SubmissionSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    aiVerificationResult: {
      type: Boolean,
      required: true,
    },
    aiFeedback: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Appeal fields
    isAppealed: {
      type: Boolean,
      default: false,
    },
    appealReason: {
      type: String,
      maxlength: 500,
    },
    appealedAt: {
      type: Date,
    },
    appealStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying appealed submissions
SubmissionSchema.index({ isAppealed: 1, appealStatus: 1 });

export default mongoose.model<ISubmission>("Submission", SubmissionSchema);
