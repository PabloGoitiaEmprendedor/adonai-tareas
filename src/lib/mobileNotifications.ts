import { LocalNotifications } from '@capacitor/local-notifications';

export function isCapacitor(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform();
  } catch {
    return false;
  }
}

export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    if (!isCapacitor()) return false;
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

export async function requestLocalNotificationPermission(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  id?: number,
  scheduleAt?: Date,
): Promise<void> {
  try {
    if (!isCapacitor()) return;

    const notificationId = id ?? Date.now();

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: notificationId,
          schedule: { at: scheduleAt ?? new Date(Date.now() + 1000) },
          smallIcon: 'ic_stat_icon_configurable',
          iconColor: '#5B7CFA',
          channelId: 'default',
        },
      ],
    });
  } catch (err) {
    console.error('[mobileNotifications] Error scheduling notification:', err);
  }
}

export async function cancelLocalNotification(id: number): Promise<void> {
  try {
    if (!isCapacitor()) return;
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // silent
  }
}

export async function getPendingLocalNotifications() {
  try {
    if (!isCapacitor()) return [];
    const { notifications } = await LocalNotifications.getPending();
    return notifications;
  } catch {
    return [];
  }
}
