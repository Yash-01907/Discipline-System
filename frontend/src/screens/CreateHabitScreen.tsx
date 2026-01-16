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
  Modal,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../types/navigation";
import { useCreateHabit } from "../hooks/useHabits";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleHabitReminder } from "../utils/notifications";
import { formatTime, formatTimeFor24Hour } from "../utils/dateUtils";

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
  const [isPublic, setIsPublic] = useState(false);
  const [reminderTime, setReminderTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const handleTimeConfirm = () => {
    const time = formatTimeFor24Hour(selectedHour, selectedMinute);
    setReminderTime(time);
    setShowTimePicker(false);
  };

  const handleSubmit = async () => {
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
        isPublic,
      },
      {
        onSuccess: async (data: any) => {
          // Schedule notification if reminder time is set
          if (reminderTime && data._id) {
            await scheduleHabitReminder(data._id, title, reminderTime);
          }
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PRIVACY</Text>
          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.checkbox, isPublic && styles.checkboxActive]}>
              {isPublic && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Share on Community Feed</Text>
              <Text style={styles.privacySubtitle}>
                Your verified submissions will appear publicly
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Reminder Time Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DAILY REMINDER</Text>
          <TouchableOpacity
            style={styles.reminderToggle}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.reminderIcon}>⏰</Text>
            <View style={styles.reminderTextContainer}>
              <Text style={styles.reminderTitle}>
                {reminderTime
                  ? `Reminder at ${formatTime(
                      parseInt(reminderTime.split(":")[0]),
                      parseInt(reminderTime.split(":")[1])
                    )}`
                  : "Set a daily reminder"}
              </Text>
              <Text style={styles.reminderSubtitle}>
                {reminderTime
                  ? "Tap to change time"
                  : "Get notified to complete your habit"}
              </Text>
            </View>
            {reminderTime && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setReminderTime(null);
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

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

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Reminder Time</Text>

            <View style={styles.timePickerContainer}>
              {/* Hour Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView
                  style={styles.pickerScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.pickerItem,
                        selectedHour === hour && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedHour === hour &&
                            styles.pickerItemTextSelected,
                        ]}
                      >
                        {hour.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minute Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView
                  style={styles.pickerScrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.pickerItem,
                        selectedMinute === minute && styles.pickerItemSelected,
                      ]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          selectedMinute === minute &&
                            styles.pickerItemTextSelected,
                        ]}
                      >
                        {minute.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Text style={styles.selectedTimePreview}>
              {formatTime(selectedHour, selectedMinute)}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleTimeConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  privacyToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.m,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  privacySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  // Reminder Time Styles
  reminderToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reminderIcon: {
    fontSize: 24,
    marginRight: SPACING.m,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  reminderSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "bold",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    width: "100%",
    maxWidth: 350,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.l,
  },
  timePickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.l,
  },
  pickerColumn: {
    alignItems: "center",
    width: 80,
  },
  pickerLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: SPACING.s,
    letterSpacing: 1,
  },
  pickerScrollView: {
    height: 150,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primary,
  },
  pickerItemText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    textAlign: "center",
  },
  pickerItemTextSelected: {
    color: "#FFF",
    fontWeight: "bold",
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    marginHorizontal: SPACING.m,
    marginTop: SPACING.l,
  },
  selectedTimePreview: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.l,
  },
  modalButtons: {
    flexDirection: "row",
    gap: SPACING.m,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.m,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonCancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  modalButtonConfirmText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

export default CreateHabitScreen;
