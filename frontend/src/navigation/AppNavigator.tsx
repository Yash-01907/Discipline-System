import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import BottomTabNavigator from "./BottomTabNavigator"; // Import Tab Navigator
import CreateHabitScreen from "../screens/CreateHabitScreen";
import VerifyScreen from "../screens/VerifyScreen";
import HabitDetailsScreen from "../screens/HabitDetailsScreen";
import { COLORS } from "../constants/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      {/* Main entry is now the Bottom Tabs */}
      <Stack.Screen name="Home" component={BottomTabNavigator} />

      {/* Other screens are pushed on top of tabs */}
      <Stack.Screen name="CreateHabit" component={CreateHabitScreen} />
      <Stack.Screen name="Verify" component={VerifyScreen} />
      <Stack.Screen name="HabitDetails" component={HabitDetailsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
