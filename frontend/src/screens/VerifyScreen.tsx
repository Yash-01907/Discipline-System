import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useVerifySubmission } from "../hooks/useHabits";
import { COLORS, SPACING } from "../constants/theme";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "Verify">;

const VerifyScreen = ({ route, navigation }: Props) => {
  const { habitId, habitTitle } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const verifyMutation = useVerifySubmission();

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
          setCapturedImage(photo.uri);
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
      quality: 1,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
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
            Alert.alert("VERIFIED", `Judge's Verdict: ${data.feedback}`, [
              { text: "OK", onPress: () => navigation.goBack() },
            ]);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("REJECTED", `Judge's Verdict: ${data.feedback}`);
          }
        },
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          // Check for specific backend feedback or default to detailed error
          const errorMessage =
            error.response?.data?.feedback ||
            error.response?.data?.message ||
            `Submission failed (${error.response?.status || "Network Error"})`;

          Alert.alert("Submission Failed", errorMessage);
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
});

export default VerifyScreen;
