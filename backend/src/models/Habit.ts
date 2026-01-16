import mongoose, { Document, Schema } from "mongoose";

export interface IHabit extends Document {
  title: string;
  description: string;
  type: "recurring" | "one-time";
  frequency: "Daily" | "Weekly" | "Once";
  targetDate?: Date;
  currentStreak: number;
  completedDates: Date[];
  active: boolean;
  createdAt: Date;
}

const HabitSchema: Schema = new Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IHabit>("Habit", HabitSchema);
