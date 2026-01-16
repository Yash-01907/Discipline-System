import mongoose, { Document, Schema } from "mongoose";

export interface ISubmission extends Document {
  user: mongoose.Types.ObjectId;
  habitId: mongoose.Types.ObjectId;
  imageUrl: string;
  aiVerificationResult: boolean;
  aiFeedback: string;
  timestamp: Date;
  // Appeal fields
  isAppealed: boolean;
  appealReason?: string;
  appealedAt?: Date;
  appealStatus: "none" | "pending" | "approved" | "rejected";
  isFlagged: boolean;
  // Denormalized counts for performance
  likeCount: number;
  commentCount: number;
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
    isFlagged: {
      type: Boolean,
      default: false,
    },
    // Denormalized counts for performance
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying appealed submissions
SubmissionSchema.index({ isAppealed: 1, appealStatus: 1 });

// Index for fetching submissions by habit (getHabitSubmissions)
SubmissionSchema.index({ habitId: 1, createdAt: -1 });

// Index for rate limiting queries (user + date range)
SubmissionSchema.index({ user: 1, createdAt: -1 });

// Index for community feed queries (timestamp sorted, filtered by public/flagged)
SubmissionSchema.index({ timestamp: -1, isFlagged: 1 });

export default mongoose.model<ISubmission>("Submission", SubmissionSchema);
