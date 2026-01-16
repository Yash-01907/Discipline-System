import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useVerifySubmission } from "../hooks/useHabits";
import { COLORS, SPACING } from "../constants/theme";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePendingSubmissions } from "../stores/pendingSubmissions";
import { appealSubmission } from "../api/habits";

type Props = NativeStackScreenProps<RootStackParamList, "Verify">;

const VerifyScreen = ({ route, navigation }: Props) => {
  const { habitId, habitTitle } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const verifyMutation = useVerifySubmission();
  const { addSubmission } = usePendingSubmissions();

  const [appealModalVisible, setAppealModalVisible] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(
    null
  );
  const [currentFeedback, setCurrentFeedback] = useState("");

  const initiateAppeal = (submissionId: string, feedback: string) => {
    setCurrentSubmissionId(submissionId);
    setCurrentFeedback(feedback);
    setAppealReason("");
    setAppealModalVisible(true);
  };

  const submitAppeal = async () => {
    if (!currentSubmissionId) return;

    try {
      const result = await appealSubmission(currentSubmissionId, appealReason);
      setAppealModalVisible(false);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Appeal Submitted ✓",
          "Thanks for your feedback! We'll review this to improve our AI.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Appeal Failed", result.message, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      setAppealModalVisible(false);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit appeal",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>We need your camera to audit your work.</Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={[styles.button, styles.primaryButton]}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        if (photo) {
          // Compress the image
          const compressed = await manipulateAsync(
            photo.uri,
            [{ resize: { width: 1080 } }], // Resize to reasonable width
            { compress: 0.7, format: SaveFormat.JPEG } // Compress to 70% quality
          );
          setCapturedImage(compressed.uri);
        }
      } catch (e) {
        Alert.alert("Error", "Failed to capture image");
      }
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1, // We get high quality from picker, then compress our way
    });

    if (!result.canceled) {
      try {
        const compressed = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        setCapturedImage(compressed.uri);
      } catch (e) {
        // Fallback to original if compression fails
        setCapturedImage(result.assets[0].uri);
      }
    }
  };

  const submitProof = () => {
    if (!capturedImage) return;

    verifyMutation.mutate(
      { habitId, imageUri: capturedImage },
      {
        onSuccess: (data: any) => {
          if (data.success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("VERIFIED ✓", `Judge's Verdict: ${data.feedback}`, [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Show rejection with Appeal option
            Alert.alert("REJECTED ✗", `Judge's Verdict: ${data.feedback}`, [
              {
                text: "Accept",
                style: "cancel",
                onPress: () => {},
              },
              {
                text: "🚩 Appeal",
                style: "destructive",
                onPress: () => {
                  if (data.submissionId) {
                    initiateAppeal(data.submissionId, data.feedback);
                  } else {
                    Alert.alert(
                      "Cannot Appeal",
                      "Submission ID not available. Please try again."
                    );
                  }
                },
              },
            ]);
          }
        },
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          // Check if it's a network error (no response = network issue)
          const isNetworkError =
            !error.response ||
            error.code === "NETWORK_ERROR" ||
            error.code === "ERR_NETWORK";

          if (isNetworkError) {
            // Queue for later sync
            addSubmission(habitId, habitTitle, capturedImage);

            Alert.alert(
              "Saved for Later",
              "You appear to be offline. Your submission has been saved and will be uploaded automatically when you're back online.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          } else if (error.response?.status === 403) {
            // Daily Limit Reached
            Alert.alert(
              "Daily Limit Reached 🔒",
              "You've used all your free AI verifications for today.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => navigation.goBack(),
                },
                {
                  text: "Upgrade to Pro 🚀",
                  onPress: () => navigation.navigate("Subscription"),
                },
              ]
            );
          } else {
            // Server error - show the error message
            const errorMessage =
              error.response?.data?.feedback ||
              error.response?.data?.message ||
              `Submission failed (${
                error.response?.status || "Unknown Error"
              })`;

            Alert.alert("Submission Failed", errorMessage);
          }
        },
      }
    );
  };

  const retake = () => {
    setCapturedImage(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Proving: {habitTitle}
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        {capturedImage ? (
          <Image source={{ uri: capturedImage }} style={styles.camera} />
        ) : (
          <CameraView
            style={styles.camera}
            facing={cameraType}
            ref={cameraRef}
          ></CameraView>
        )}
      </View>

      <View style={styles.controls}>
        {verifyMutation.isPending ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>JUDGE IS ANALYZING...</Text>
          </View>
        ) : (
          <>
            {capturedImage ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={retake}
                >
                  <Text style={styles.secondaryButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={submitProof}
                >
                  <Text style={styles.buttonText}>SUBMIT EVIDENCE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.captureControls}>
                <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                  <Text style={styles.iconButtonText}>🖼️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureInner} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() =>
                    setCameraType((current) =>
                      current === "back" ? "front" : "back"
                    )
                  }
                >
                  <Text style={styles.iconButtonText}>🔄</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Appeal Modal */}
      <Modal
        visible={appealModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAppealModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Appeal Decision 🚩</Text>
            <Text style={styles.modalSubtitle}>
              The AI said: "{currentFeedback}"
            </Text>
            <Text style={styles.modalLabel}>Why is this incorrect?</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.modalInput}
                placeholder="E.g., I did the task but the lighting was bad..."
                placeholderTextColor={COLORS.textSecondary}
                value={appealReason}
                onChangeText={setAppealReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setAppealModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={submitAppeal}
              >
                <Text style={styles.modalButtonTextSubmit}>Submit Appeal</Text>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.m,
    zIndex: 1,
  },
  backButton: {
    paddingRight: SPACING.m,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "bold",
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraContainer: {
    flex: 1,
    margin: SPACING.m,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  camera: {
    flex: 1,
  },
  controls: {
    height: 150,
    justifyContent: "center",
    paddingBottom: SPACING.l,
  },
  captureControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  button: {
    paddingVertical: SPACING.m,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  buttonText: {
    color: COLORS.background,
    fontWeight: "bold",
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },
  text: {
    color: COLORS.text,
    marginBottom: SPACING.m,
  },
  iconButton: {
    padding: SPACING.m,
  },
  iconButtonText: {
    fontSize: 24,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.primary,
    marginTop: SPACING.s,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  // Appeal Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.m,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    padding: SPACING.l,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.s,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: SPACING.m,
    textAlign: "center",
    fontWeight: "500",
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  inputContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.s,
    marginBottom: SPACING.l,
  },
  modalInput: {
    minHeight: 80,
    fontSize: 16,
    color: COLORS.text,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.m,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
  },
  modalButtonSubmit: {
    backgroundColor: COLORS.primary,
  },
  modalButtonTextCancel: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  modalButtonTextSubmit: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

export default VerifyScreen;
