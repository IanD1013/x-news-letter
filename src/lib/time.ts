const LOCALE = "en";

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
const absolute = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" });
const monthDay = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric" });
const yearMonthDay = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const compact = new Intl.NumberFormat(LOCALE, { notation: "compact" });

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export function relativeTime(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const diff = (date.getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return "just now";
  if (abs < HOUR) return relative.format(Math.round(diff / MINUTE), "minute");
  if (abs < DAY) return relative.format(Math.round(diff / HOUR), "hour");
  if (abs < 7 * DAY) return relative.format(Math.round(diff / DAY), "day");
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return (sameYear ? monthDay : yearMonthDay).format(date);
}

export function absoluteTime(iso: string): string {
  return absolute.format(new Date(iso));
}

export function compactNumber(n: number): string {
  return compact.format(n);
}
