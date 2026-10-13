import type { TaskFrequency } from "@/app/generated/prisma/client";
import { getBusinessDateString, getBusinessTimeZone, isValidDateString } from "@/lib/business-date";

/**
 * Single source of truth for "is this location task due on this date?".
 *
 * Used both by Evaluating Officer daily monitoring (which tasks can be
 * evaluated today) and by monthly report generation (how many occurrences were
 * expected). Keeping one implementation guarantees the two never disagree.
 *
 * - DAILY: every day from the day the task was assigned.
 * - WEEKLY: the same weekday as the assignment date.
 * - MONTHLY: the same day-of-month as the assignment date. Tasks anchored on
 *   the 29th-31st fall back to the last day of shorter months, so a task
 *   created on 31 January is still due on 28/29 February, 30 April, etc.
 */
export function isTaskScheduledOn(
  task: { frequency: TaskFrequency; createdAt: Date },
  date: string,
  timeZone = getBusinessTimeZone(),
) {
  if (!isValidDateString(date)) return false;

  const anchor = getBusinessDateString(task.createdAt, timeZone);
  if (date < anchor) return false;

  if (task.frequency === "DAILY") return true;

  const [year, month, day] = date.split("-").map(Number);
  const [anchorYear, anchorMonth, anchorDay] = anchor.split("-").map(Number);

  if (task.frequency === "WEEKLY") {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const anchorWeekday = new Date(Date.UTC(anchorYear, anchorMonth - 1, anchorDay)).getUTCDay();
    return weekday === anchorWeekday;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day === Math.min(anchorDay, daysInMonth);
}
