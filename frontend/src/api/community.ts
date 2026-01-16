import client from "./client";

export interface FeedItem {
  _id: string;
  imageUrl: string;
  habitTitle: string;
  habitDescription: string;
  userName: string;
  userId?: string;
  aiFeedback: string;
  timestamp: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

export interface Comment {
  _id: string;
  text: string;
  userName: string;
  createdAt: string;
}

export const fetchCommunityFeed = async (): Promise<FeedItem[]> => {
  const { data } = await client.get("/community/feed");
  return data;
};

export const toggleLike = async (
  submissionId: string
): Promise<{ success: boolean; isLiked: boolean; likeCount: number }> => {
  const { data } = await client.post(`/community/${submissionId}/like`);
  return data;
};

export const addComment = async (
  submissionId: string,
  text: string
): Promise<{ success: boolean; comment: Comment; commentCount: number }> => {
  const { data } = await client.post(`/community/${submissionId}/comment`, {
    text,
  });
  return data;
};

export const fetchComments = async (
  submissionId: string,
  skip: number = 0,
  limit: number = 20
): Promise<Comment[]> => {
  const { data } = await client.get(
    `/community/${submissionId}/comments?skip=${skip}&limit=${limit}`
  );
  return data;
};

export const reportSubmission = async (
  submissionId: string
): Promise<{ success: boolean; message: string }> => {
  const { data } = await client.post(`/community/${submissionId}/report`);
  return data;
};

export const blockUser = async (
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const { data } = await client.post(`/community/block/${userId}`);
  return data;
};
