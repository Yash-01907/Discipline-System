export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  CreateHabit: undefined;
  Verify: { habitId: string; habitTitle: string };
  HabitDetails: { habitId: string; habitTitle: string };
  Subscription: undefined;
};
