import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from user
 * @returns Permission status
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    // Set notification channel for Android
    await Notifications.setNotificationChannelAsync("habit-reminders", {
      name: "Habit Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F46E5",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Schedule a daily notification for a habit
 * @param habitId - The habit ID for deep linking
 * @param habitTitle - The habit title for notification content
 * @param reminderTime - Time string in HH:MM format (24-hour)
 * @returns The notification identifier
 */
export async function scheduleHabitReminder(
  habitId: string,
  habitTitle: string,
  reminderTime: string
): Promise<string | null> {
  try {
    // Parse the reminder time
    const [hours, minutes] = reminderTime.split(":").map(Number);

    // Cancel any existing notification for this habit
    await cancelHabitReminder(habitId);

    // Schedule the notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Time for your habit!",
        body: `Don't forget: ${habitTitle}`,
        data: {
          habitId,
          habitTitle,
          screen: "Verify",
        },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
        channelId: Platform.OS === "android" ? "habit-reminders" : undefined,
      },
    });

    console.log(
      `Scheduled notification for habit ${habitId} at ${reminderTime}`
    );
    return identifier;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
}

/**
 * Cancel a scheduled notification for a habit
 * @param habitId - The habit ID to cancel notification for
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      if (notification.content.data?.habitId === habitId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
        console.log(`Cancelled notification for habit ${habitId}`);
      }
    }
  } catch (error) {
    console.error("Failed to cancel notification:", error);
  }
}

/**
 * Get all scheduled notifications for debugging
 */
export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
