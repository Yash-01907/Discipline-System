import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchHabits,
  createHabit,
  verifySubmission,
  Habit,
} from "../api/habits";

import client from "../api/client";

export const fetchUserStats = async () => {
  const { data } = await client.get("/users/stats");
  return data;
};

export const useUserStats = () => {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: fetchUserStats,
  });
};

export const useHabits = () => {
  return useQuery({
    queryKey: ["habits"],
    queryFn: fetchHabits,
  });
};

export const useCreateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHabit,
    // Optimistic update
    onMutate: async (newHabit) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["habits"] });

      // Snapshot current data
      const previousHabits = queryClient.getQueryData<Habit[]>(["habits"]);

      // Optimistically update with temporary ID
      const optimisticHabit: Habit = {
        _id: `temp-${Date.now()}`,
        title: newHabit.title,
        description: newHabit.description,
        type: (newHabit.type as "recurring" | "one-time") || "recurring",
        frequency:
          (newHabit.frequency as "Daily" | "Weekly" | "Once") || "Daily",
        targetDate: newHabit.targetDate?.toISOString(),
        currentStreak: 0,
        completedDates: [],
        active: true,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Habit[]>(["habits"], (old) =>
        old ? [optimisticHabit, ...old] : [optimisticHabit]
      );

      // Return context with snapshot for rollback
      return { previousHabits };
    },
    onError: (err, newHabit, context) => {
      // Rollback to previous state on error
      if (context?.previousHabits) {
        queryClient.setQueryData(["habits"], context.previousHabits);
      }
    },
    onSettled: () => {
      // Refetch to sync with server regardless of success/failure
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
};

export const useVerifySubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      habitId,
      imageUri,
    }: {
      habitId: string;
      imageUri: string;
    }) => verifySubmission(habitId, imageUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
};
