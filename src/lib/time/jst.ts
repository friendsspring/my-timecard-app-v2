import { format, fromZonedTime, toZonedTime } from "date-fns-tz";
import { format as formatDate } from "date-fns";

export const JST = "Asia/Tokyo" as const;

/** Returns "YYYY-MM-DD" in JST */
export function toJstDateString(date: Date): string {
  return format(toZonedTime(date, JST), "yyyy-MM-dd", { timeZone: JST });
}

/** Returns "HH:mm" in JST */
export function toJstTimeString(date: Date): string {
  return format(toZonedTime(date, JST), "HH:mm", { timeZone: JST });
}

/** Returns "YYYY-MM" in JST */
export function toJstYearMonth(date: Date): string {
  return format(toZonedTime(date, JST), "yyyy-MM", { timeZone: JST });
}

/** "YYYY-MM" -> [startUtc, endUtc) (utc Date pair) */
export function jstMonthRangeToUtc(yearMonth: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }

  // JST の月初 00:00 と翌月初 00:00 を UTC に変換
  const startLocal = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endLocal = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00`;

  return {
    start: fromZonedTime(startLocal, JST),
    end: fromZonedTime(endLocal, JST),
  };
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(`Invalid yearMonth: ${yearMonth}`);
  }
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

export function currentYearMonthJst(): string {
  return toJstYearMonth(new Date());
}

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-05-08 (金)" */
export function formatJstDateWithWeekday(date: Date): string {
  const jst = toZonedTime(date, JST);
  return `${formatDate(jst, "yyyy-MM-dd")} (${WEEKDAY[jst.getDay()]})`;
}

/** Returns "YYYY-MM-DDTHH:mm" string suitable for <input type="datetime-local"> */
export function toJstDatetimeLocal(date: Date): string {
  return format(toZonedTime(date, JST), "yyyy-MM-dd'T'HH:mm", { timeZone: JST });
}

/** Convert "<input type=datetime-local> value" (interpreted as JST) to a UTC Date */
export function fromJstDatetimeLocal(value: string): Date {
  return fromZonedTime(value, JST);
}

/** Format "YYYY-MM" -> "2026年5月" */
export function formatYearMonthJa(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const month = Number(monthStr);
  return `${yearStr}年${month}月`;
}
