import { useQuery } from "@tanstack/react-query";
import { fetchSubmissions } from "../api/submissions";

export const useSubmissions = (habitId: string) => {
  return useQuery({
    queryKey: ["submissions", habitId],
    queryFn: () => fetchSubmissions(habitId),
    enabled: !!habitId,
  });
};
