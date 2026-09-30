export function buildReminderPlan(
  currentNotificationId: string | null,
  active: boolean,
  enabled: boolean,
  time: string | null,
) {
  return {
    cancelNotificationId: currentNotificationId,
    shouldSchedule: active && enabled && Boolean(time),
  };
}

export function notificationIdsForDeletion(records: { notification_id: string | null }[]) {
  return [...new Set(records.map((record) => record.notification_id).filter((id): id is string => Boolean(id)))];
}
