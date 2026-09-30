const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;

export function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function isCalendarDate(year: number, month: number, day: number) {
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function isISODate(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  return isCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function displayDateToISO(value: string) {
  const match = DISPLAY_DATE.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isoToDisplayDate(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match || !isISODate(value)) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function todayDisplayDate() {
  return isoToDisplayDate(todayISO());
}

export function displayDateToLocalDate(value: string) {
  const iso = displayDateToISO(value);
  if (!iso) return null;
  const match = ISO_DATE.exec(iso)!;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function localDateToDisplayDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

export function formatDateInput(value: string) {
  if (ISO_DATE.test(value) && isISODate(value)) return isoToDisplayDate(value);
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function formatDate(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match || !isISODate(value)) return value;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
