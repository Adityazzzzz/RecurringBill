import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleNotification(sub: Subscription, offsetDays: number): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    if (!sub.renewalDate) return null;

    const triggerDate = dayjs(sub.renewalDate).subtract(offsetDays, 'days').toDate();
    if (triggerDate.getTime() <= Date.now()) {
      // If the trigger date is in the past, don't schedule
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Subscription Renewal Alert 💳',
        body: `Your subscription to ${sub.name} is renewing in ${offsetDays} day(s) for ${sub.price} ${sub.currency || 'USD'}.`,
        sound: true,
      },
      trigger: triggerDate,
    });

    return id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

export async function cancelNotification(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error(`Failed to cancel notification with id ${id}:`, error);
  }
}
