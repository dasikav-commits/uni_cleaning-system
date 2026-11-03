// Client-safe helpers for monthly reporting periods ("2026-03").
import { getBusinessDateString } from "@/lib/business-date";

export type Period = { year: number; month: number };

export function periodKey({ year, month }: Period) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function periodLabel({ year, month }: Period) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function monthName(month: number) {
  return new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));
}

export function daysInMonth({ year, month }: Period) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function currentPeriod(now = new Date()): Period {
  const today = getBusinessDateString(now);
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

/** The month before the current one: reports are normally prepared for the month just ended. */
export function previousPeriod(period: Period = currentPeriod()): Period {
  return period.month === 1 ? { year: period.year - 1, month: 12 } : { year: period.year, month: period.month - 1 };
}

export function nextPeriod(period: Period): Period {
  return period.month === 12 ? { year: period.year + 1, month: 1 } : { year: period.year, month: period.month + 1 };
}

export function comparePeriods(a: Period, b: Period) {
  return a.year === b.year ? a.month - b.month : a.year - b.year;
}

export function isValidPeriod(period: Partial<Period>): period is Period {
  return (
    Number.isInteger(period.year) &&
    Number.isInteger(period.month) &&
    (period.month as number) >= 1 &&
    (period.month as number) <= 12 &&
    (period.year as number) >= 2000 &&
    (period.year as number) <= 2100
  );
}

/** Parses "2026-03"; returns null for anything else. */
export function parsePeriodKey(value: string | null | undefined): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const period = { year: Number(match[1]), month: Number(match[2]) };
  return isValidPeriod(period) ? period : null;
}

/** Period from a `?period=YYYY-MM` search param, defaulting to the previous month, never in the future. */
export function periodFromSearchParam(value: string | string[] | undefined, fallback: Period = previousPeriod()): Period {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = parsePeriodKey(raw);
  if (!parsed) return fallback;
  return comparePeriods(parsed, currentPeriod()) > 0 ? currentPeriod() : parsed;
}

/** The last `count` periods ending with the current month (newest first). */
export function recentPeriods(count = 13, from: Period = currentPeriod()) {
  const periods: Period[] = [];
  let cursor = from;
  for (let index = 0; index < count; index += 1) {
    periods.push(cursor);
    cursor = previousPeriod(cursor);
  }
  return periods;
}
