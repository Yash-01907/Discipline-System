import mongoose, { Document, Schema } from "mongoose";

export interface IHabit extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: "recurring" | "one-time";
  frequency: "Daily" | "Weekly" | "Once";
  targetDate?: Date;
  currentStreak: number;
  completedDates: Date[];
  active: boolean;
  createdAt: Date;
  strictness: "low" | "medium" | "high";
  isPublic: boolean;
}

const HabitSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["recurring", "one-time"],
      default: "recurring",
    },
    frequency: {
      type: String,
      enum: ["Daily", "Weekly", "Once"],
      default: "Daily",
    },
    targetDate: {
      type: Date, // For one-time goals
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    completedDates: {
      type: [Date], // Track specific dates completed
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    strictness: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    isPublic: {
      type: Boolean,
      default: false, // Private by default for user safety
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IHabit>("Habit", HabitSchema);
