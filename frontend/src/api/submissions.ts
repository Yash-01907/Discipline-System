import client from "./client";

export interface Submission {
  _id: string;
  habitId: string;
  imageUrl: string;
  aiVerificationResult: boolean;
  aiFeedback: string;
  timestamp: string;
}

export const fetchSubmissions = async (
  habitId: string
): Promise<Submission[]> => {
  const { data } = await client.get(`/submissions/${habitId}`);
  return data;
};
