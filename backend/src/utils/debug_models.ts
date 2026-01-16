import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Dummy init to access client if needed, or just use direct list if sdk supports it.
    // Actually the SDK doesn't expose listModels directly on the instance easily in all versions without init.
    // Let's use the fetch directly or check if SDK has a helper.
    // The current SDK pattern usually requires hitting the rest API or looking at docs.

    // However, for this debug, I'll just try to use a known working model string `gemini-1.5-flash-001`.
    console.log("Testing gemini-1.5-flash-001...");
  } catch (e) {
    console.error(e);
  }
}

// Let's just try to change the model in the main file to 'gemini-1.5-flash-001' which is the stable version.
// Also 'gemini-1.5-pro'
