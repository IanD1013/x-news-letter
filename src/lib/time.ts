const relative = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" });
const monthDay = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" });
const yearMonthDay = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});
const compact = new Intl.NumberFormat("zh-CN", { notation: "compact" });

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export function relativeTime(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const diff = (date.getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return "刚刚";
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
