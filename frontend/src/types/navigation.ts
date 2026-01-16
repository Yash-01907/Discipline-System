export type RootStackParamList = {
  Home: undefined;
  CreateHabit: undefined;
  Verify: { habitId: string; habitTitle: string };
  HabitDetails: { habitId: string; habitTitle: string };
};
