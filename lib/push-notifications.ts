import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerForPushNotifications(): Promise<string | null> {
  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Send token to backend
  try {
    await api.post('/api/push-token', {
      pushToken,
      platform: Platform.OS,
    });
    console.log('Push token registered:', pushToken);
  } catch (err) {
    console.error('Failed to register push token with backend:', err);
  }

  return pushToken;
}

// ---------------------------------------------------------------------------
// Listeners
// ---------------------------------------------------------------------------

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function getBadgeCountAsync(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCountAsync(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
