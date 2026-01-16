import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import BottomTabNavigator from "./BottomTabNavigator"; // Import Tab Navigator
import CreateHabitScreen from "../screens/CreateHabitScreen";
import VerifyScreen from "../screens/VerifyScreen";
import HabitDetailsScreen from "../screens/HabitDetailsScreen";
import { COLORS } from "../constants/theme";

import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { ActivityIndicator, View } from "react-native";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: "slide_from_right",
      }}
    >
      {user ? (
        <>
          {/* Main App Stack */}
          <Stack.Screen name="Home" component={BottomTabNavigator} />
          <Stack.Screen name="CreateHabit" component={CreateHabitScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
          <Stack.Screen name="HabitDetails" component={HabitDetailsScreen} />
        </>
      ) : (
        <>
          {/* Auth Stack */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
