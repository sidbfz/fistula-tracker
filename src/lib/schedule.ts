import { isTime } from './date';

export function localISODate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function localISOTimestamp(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 19);
}

export function dateAtTime(time: string, now = new Date()) {
  if (!isTime(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target;
}

export function scheduledTimestamp(time: string, now = new Date()) {
  if (!isTime(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  return localISOTimestamp(target);
}

export function isSameLocalDay(timestamp: string, now = new Date()) {
  return timestamp.slice(0, 10) === localISODate(now);
}

export function hasRecordedStatus(
  events: { status: string; occurred_at: string; scheduled_for: string | null }[],
  scheduledFor: string | null,
  now = new Date(),
) {
  return events.some((event) => {
    if (!['taken', 'done', 'skipped'].includes(event.status)) return false;
    if (scheduledFor && event.scheduled_for) return event.scheduled_for === scheduledFor;
    return isSameLocalDay(event.occurred_at, now);
  });
}
