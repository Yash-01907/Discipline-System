import client from "./client";

export interface Habit {
  _id: string;
  title: string;
  description: string;
  type: "recurring" | "one-time";
  frequency: "Daily" | "Weekly" | "Once";
  targetDate?: string;
  currentStreak: number;
  completedDates: string[];
  active: boolean;
  createdAt: string;
}

export interface VerifyResponse {
  success: boolean;
  feedback: string;
  streak?: number;
  submissionId?: string;
}

export const fetchHabits = async (): Promise<Habit[]> => {
  const { data } = await client.get("/habits");
  return data;
};

export const createHabit = async (habit: {
  title: string;
  description: string;
  frequency: string;
  type?: string;
  targetDate?: Date;
  isPublic?: boolean;
}) => {
  const { data } = await client.post("/habits", habit);
  return data;
};

export const verifySubmission = async (
  habitId: string,
  imageUri: string
): Promise<VerifyResponse> => {
  const formData = new FormData();

  // React Native FormData requires specific object structure for files
  // @ts-ignore
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg", // Adjust based on actual image type if needed
    name: "evidence.jpg",
  });
  formData.append("habitId", habitId);

  const { data } = await client.post("/verify", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const appealSubmission = async (
  submissionId: string,
  reason?: string
): Promise<{ success: boolean; message: string; appealStatus?: string }> => {
  const { data } = await client.post(`/submissions/${submissionId}/appeal`, {
    reason,
  });
  return data;
};
