import mongoose, { Document, Schema } from "mongoose";

export interface IComment extends Document {
  user: mongoose.Types.ObjectId;
  submission: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const CommentSchema: Schema = new Schema(
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
    text: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
CommentSchema.index({ submission: 1, createdAt: -1 });

export default mongoose.model<IComment>("Comment", CommentSchema);
