import { z } from "zod";

/**
 * Environment Configuration
 * Validates all required environment variables at startup.
 * If validation fails, the app will crash immediately with a clear error message.
 */

const envSchema = z.object({
  // Server
  PORT: z.string().default("5000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),

  // Authentication
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),

  // Cloudinary (Image Storage)
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // AI Service
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  // Optional: RevenueCat (Subscriptions)
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
});

// Validate and parse environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsedEnv.error.format());
  process.exit(1);
}

// Export validated and typed environment variables
export const env = parsedEnv.data;
