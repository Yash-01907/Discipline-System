import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const verifyImageWithGemini = async (
  imagePath: string,
  habitTitle: string,
  mimeType: string
): Promise<{ verified: boolean; reason: string }> => {
  try {
    const prompt = `You are a strict, skeptical habit verification judge. Analyze this image. Does it definitively prove the user completed the task: '${habitTitle}'? Look for fitness app screens, open books, written notes, or gym equipment appropriate to the context. If the image is vague, dark, or irrelevant, REJECT it. Return a JSON response ONLY: { "verified": boolean, "reason": string }.`;

    const imageParts = [
      {
        inlineData: {
          data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
          mimeType: mimeType,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    // Clean up the text to ensure it's valid JSON (remove markdown code blocks if any)
    const jsonString = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(jsonString);
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
