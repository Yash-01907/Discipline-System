import { z } from "zod";

export const createHabitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  frequency: z.enum(["Daily", "Weekly", "Once"]).default("Daily"),
  type: z.enum(["recurring", "one-time"]).default("recurring"),
  targetDate: z.string().optional().or(z.date()), // Accepts ISO string or Date object
  strictness: z.enum(["low", "medium", "high"]).default("medium"),
  isPublic: z.boolean().default(false),
});

export const registerUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
