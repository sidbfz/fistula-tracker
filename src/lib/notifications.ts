import { Platform } from 'react-native';

import { getSetting } from '@/src/lib/db';
import type { Reminder } from '@/src/types';

let notificationsPromise: Promise<typeof import('expo-notifications')> | null = null;

async function loadNotifications() {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      return Notifications;
    });
  }
  return notificationsPromise;
}

const reminderCopy: Record<Reminder['kind'], { title: string; body: string }> = {
  check_in: { title: 'Recovery check-in', body: 'A quiet moment for your recovery, if it feels useful.' },
  medication: { title: 'Medication reminder', body: 'A gentle reminder for your scheduled medication.' },
  sitz_bath: { title: 'Sitz bath reminder', body: 'This is your scheduled sitz bath reminder.' },
  dressing_change: { title: 'Dressing change reminder', body: 'This is your scheduled dressing change reminder.' },
};

const discreetReminderCopy: Record<Reminder['kind'], { title: string; body: string }> = {
  check_in: { title: 'Fistula Tracker', body: 'A quiet check-in is waiting.' },
  medication: { title: 'Fistula Tracker', body: 'A reminder you scheduled is waiting.' },
  sitz_bath: { title: 'Fistula Tracker', body: 'A reminder you scheduled is waiting.' },
  dressing_change: { title: 'Fistula Tracker', body: 'A reminder you scheduled is waiting.' },
};

export async function configureNotifications() {
  const Notifications = await loadNotifications();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('recovery-reminders', {
      name: 'Recovery reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermission() {
  await configureNotifications();
  const Notifications = await loadNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return true;
  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
}

export async function getNotificationPermissionStatus() {
  await configureNotifications();
  const Notifications = await loadNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  return {
    granted: permissions.granted,
    canAskAgain: permissions.canAskAgain,
  };
}

export async function scheduleDailyReminder(kind: Reminder['kind'], time: string, requestPermission = true) {
  const Notifications = await ensureNotificationPermission(requestPermission);
  const [hour, minute] = time.split(':').map(Number);
  const discreet = (await getSetting('notification_wording')) === 'discreet';
  return Notifications.scheduleNotificationAsync({
    content: discreet ? discreetReminderCopy[kind] : reminderCopy[kind],
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'recovery-reminders' : undefined,
    },
  });
}

async function notificationCopy(title: string, body: string) {
  const discreet = (await getSetting('notification_wording')) === 'discreet';
  return discreet ? { title: 'Fistula Tracker', body: 'A reminder you scheduled is waiting.' } : { title, body };
}

async function ensureNotificationPermission(requestIfNeeded = true) {
  await configureNotifications();
  const Notifications = await loadNotifications();
  const permissions = await Notifications.getPermissionsAsync();
  const finalPermissions = permissions.granted || !requestIfNeeded ? permissions : await Notifications.requestPermissionsAsync();
  if (!finalPermissions.granted) throw new Error('Notification permission was not granted.');
  return Notifications;
}

export async function scheduleMedicationReminder(name: string, time: string, weekdays: number[], requestPermission = true) {
  const Notifications = await ensureNotificationPermission(requestPermission);
  const [hour, minute] = time.split(':').map(Number);
  const content = await notificationCopy('Medication reminder', `${name} — follow the instructions on your label.`);
  if (weekdays.length === 7) {
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? 'recovery-reminders' : undefined,
      },
    });
  }
  const identifiers: string[] = [];
  try {
    for (const weekday of weekdays) {
      identifiers.push(await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? 'recovery-reminders' : undefined,
        },
      }));
    }
    return JSON.stringify(identifiers);
  } catch (reason) {
    await Promise.allSettled(identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)));
    throw reason;
  }
}

export async function scheduleRoutineReminder(title: string, time: string, requestPermission = true) {
  const Notifications = await ensureNotificationPermission(requestPermission);
  const [hour, minute] = time.split(':').map(Number);
  return Notifications.scheduleNotificationAsync({
    content: await notificationCopy(title, 'A routine reminder you created is ready.'),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'recovery-reminders' : undefined,
    },
  });
}

export async function schedulePostponedReminder(title: string, date: Date) {
  const Notifications = await ensureNotificationPermission();
  return Notifications.scheduleNotificationAsync({
    content: await notificationCopy(title, 'A reminder you postponed is ready.'),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? 'recovery-reminders' : undefined,
    },
  });
}

export async function cancelReminder(identifier: string | null) {
  if (identifier) {
    const Notifications = await loadNotifications();
    let identifiers = [identifier];
    try {
      const parsed = JSON.parse(identifier);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) identifiers = parsed;
    } catch {
      // Older reminders store one native identifier directly.
    }
    await Promise.allSettled(identifiers.map((item) => Notifications.cancelScheduledNotificationAsync(item)));
  }
}

export async function cancelAllReminders() {
  const Notifications = await loadNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
}
