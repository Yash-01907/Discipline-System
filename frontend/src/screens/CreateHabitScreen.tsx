import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../types/navigation";
import { useCreateHabit } from "../hooks/useHabits";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

type CreateHabitScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CreateHabit"
>;

const CreateHabitScreen = () => {
  const navigation = useNavigation<CreateHabitScreenNavigationProp>();
  const createHabitMutation = useCreateHabit();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"recurring" | "one-time">("recurring");
  const [frequency, setFrequency] = useState("Daily");

  const handleSubmit = () => {
    if (!title || !description) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    createHabitMutation.mutate(
      {
        title,
        description,
        frequency,
        type,
        targetDate: type === "one-time" ? new Date() : undefined,
      },
      {
        onSuccess: () => {
          Alert.alert("Success", "Commitment locked in.");
          navigation.goBack();
        },
        onError: (error: any) => {
          Alert.alert(
            "Error",
            error.response?.data?.message || "Failed to create habit"
          );
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← </Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Commitment</Text>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>GOAL TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Run 10km"
            placeholderTextColor={COLORS.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g. Morning cardio session, no excuses."
            placeholderTextColor={COLORS.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>TYPE</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                type === "recurring" && styles.toggleBtnActive,
              ]}
              onPress={() => setType("recurring")}
            >
              <Text
                style={[
                  styles.toggleText,
                  type === "recurring" && styles.toggleTextActive,
                ]}
              >
                Recurring
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                type === "one-time" && styles.toggleBtnActive,
              ]}
              onPress={() => setType("one-time")}
            >
              <Text
                style={[
                  styles.toggleText,
                  type === "one-time" && styles.toggleTextActive,
                ]}
              >
                One-Time
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {type === "recurring" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FREQUENCY</Text>
            <View style={styles.frequencyContainer}>
              {["Daily", "Weekly"].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    frequency === freq && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === freq && styles.frequencyTextSelected,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={createHabitMutation.isPending}
        >
          {createHabitMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>COMMIT</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.m,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  backButton: {
    paddingRight: SPACING.m,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.l,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: SPACING.s,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: COLORS.text,
  },
  frequencyContainer: {
    flexDirection: "row",
    gap: SPACING.m,
  },
  frequencyOption: {
    flex: 1,
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  frequencyOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(79, 70, 229, 0.05)",
  },
  frequencyText: {
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },
  frequencyTextSelected: {
    color: COLORS.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 12,
    alignItems: "center",
    marginTop: SPACING.l,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});

export default CreateHabitScreen;
