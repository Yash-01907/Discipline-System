import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: { responseMimeType: "application/json" },
});

interface IHabitContext {
  title: string;
  description: string;
  strictness?: "low" | "medium" | "high";
}

export const verifyImageWithGemini = async (
  imagePath: string,
  habit: IHabitContext,
  mimeType: string
): Promise<{ verified: boolean; reason: string }> => {
  try {
    // 1. Determine Context
    const lowerTitle = habit.title.toLowerCase();
    const lowerDesc = habit.description.toLowerCase();
    const combined = lowerTitle + " " + lowerDesc;

    let contextPrompt = "";
    if (
      combined.includes("gym") ||
      combined.includes("workout") ||
      combined.includes("fitness") ||
      combined.includes("run")
    ) {
      contextPrompt =
        "Look specifically for gym equipment, sweat, timestamped fitness app screenshots (Strava/Apple Watch), or treadmills.";
    } else if (
      combined.includes("read") ||
      combined.includes("book") ||
      combined.includes("study")
    ) {
      contextPrompt =
        "Look for open book pages with legible text, a Kindle screen with percentage read, or handwritten study notes.";
    } else if (
      combined.includes("code") ||
      combined.includes("coding") ||
      combined.includes("program")
    ) {
      contextPrompt =
        "Look for an IDE (VS Code, IntelliJ) on a screen with visible code syntax. Ensure it is not just a generic wallpaper.";
    } else if (combined.includes("water") || combined.includes("drink")) {
      contextPrompt =
        "Look for a water bottle, glass, or hydration tracking app.";
    } else {
      contextPrompt =
        "Look for visual evidence directly related to the task description.";
    }

    // 2. Determine Strictness
    const strictness = habit.strictness || "medium";
    let strictnessPrompt = "";
    switch (strictness) {
      case "high":
        strictnessPrompt =
          "Be EXTREMELY SKEPTICAL. If the image is blurry, generic, dark, or could be a stock photo, REJECT IT. The proof must be undeniable.";
        break;
      case "low":
        strictnessPrompt =
          "Be LENIENT. As long as the image is vaguely related to the topic, accept it. Trust the user.";
        break;
      case "medium":
      default:
        strictnessPrompt =
          "Be FAIR but critical. Reject obvious fakes or completely irrelevant images, but accept reasonable proof.";
        break;
    }

    // 3. Construct Final Prompt
    const prompt = `
      You are an AI verification judge for a habit tracking app.
      
      TASK: '${habit.title}'
      DESCRIPTION: '${habit.description}'
      
      ${contextPrompt}
      
      STRICTNESS LEVEL: ${strictness.toUpperCase()}
      INSTRUCTION: ${strictnessPrompt}
      
      Analyze the image provided. Does it prove the user completed the task?
      Return a JSON response ONLY: { "verified": boolean, "reason": "Short, witty feedback string (max 15 words)" }.
      `;

    const fileBuffer = await fs.promises.readFile(imagePath);
    const imageParts = [
      {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType: mimeType,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response securely (guaranteed by JSON mode)
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", text);
      return {
        verified: false,
        reason: "AI response format error. Verification failed.",
      };
    }
  } catch (error) {
    console.error("Gemini Verification Error:", error);
    return { verified: false, reason: "AI verification service unavailable." };
  }
};
