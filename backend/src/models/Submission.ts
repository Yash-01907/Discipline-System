import mongoose, { Document, Schema } from "mongoose";

export interface ISubmission extends Document {
  habitId: mongoose.Schema.Types.ObjectId;
  imageUrl: string;
  aiVerificationResult: boolean;
  aiFeedback: string;
  timestamp: Date;
}

const SubmissionSchema: Schema = new Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISubmission>("Submission", SubmissionSchema);
