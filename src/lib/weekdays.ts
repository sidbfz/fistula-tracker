export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const WEEKDAY_OPTIONS = [
  { value: 2, short: 'M', label: 'Monday' },
  { value: 3, short: 'T', label: 'Tuesday' },
  { value: 4, short: 'W', label: 'Wednesday' },
  { value: 5, short: 'T', label: 'Thursday' },
  { value: 6, short: 'F', label: 'Friday' },
  { value: 7, short: 'S', label: 'Saturday' },
  { value: 1, short: 'S', label: 'Sunday' },
] as const;

export function serializeWeekdays(days: readonly number[]) {
  return [...new Set(days.filter((day) => ALL_WEEKDAYS.includes(day as (typeof ALL_WEEKDAYS)[number])))].sort((left, right) => left - right).join(',');
}

export function parseWeekdays(value?: string | null) {
  const parsed = (value ?? '').split(',').map(Number).filter((day) => ALL_WEEKDAYS.includes(day as (typeof ALL_WEEKDAYS)[number]));
  return parsed.length ? [...new Set(parsed)].sort((left, right) => left - right) : [];
}

export function expoWeekday(date: Date) {
  return date.getDay() + 1;
}

export function includesDate(days: readonly number[], date: Date) {
  return days.includes(expoWeekday(date));
}

export function weekdaySummary(days: readonly number[]) {
  if (days.length === 7) return 'Every day';
  return WEEKDAY_OPTIONS.filter((option) => days.includes(option.value)).map((option) => option.label.slice(0, 3)).join(', ');
}
