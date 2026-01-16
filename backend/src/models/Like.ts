import mongoose, { Document, Schema } from "mongoose";

export interface ILike extends Document {
  user: mongoose.Schema.Types.ObjectId;
  submission: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
}

const LikeSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate likes
LikeSchema.index({ user: 1, submission: 1 }, { unique: true });

// Index for counting likes on a submission
LikeSchema.index({ submission: 1 });

export default mongoose.model<ILike>("Like", LikeSchema);
