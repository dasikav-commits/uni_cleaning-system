import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { getBusinessDateString } from "@/lib/business-date";
import {
  PHI_DAILY_FIELDS,
  PHI_DAILY_FIELD_BY_CATEGORY,
  PHI_MONTHLY_ATTENDANCE_CATEGORIES,
  isPhiMonthlyAttendanceLocked,
  type PhiDailyAttendanceField,
  type PhiMonthlyAttendanceCategory,
} from "@/lib/phi-monthly-attendance-categories";
import { daysInMonth, isValidPeriod, periodKey, type Period } from "@/lib/periods";
import type { Actor } from "@/lib/reporting-assignments";

export class PhiDailyAttendanceError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PhiDailyAttendanceError";
    this.code = code;
    this.status = status;
  }
}

export type DailyCounts = Record<PhiDailyAttendanceField, number>;

export function emptyCounts(): DailyCounts {
  return Object.fromEntries(PHI_DAILY_FIELDS.map((field) => [field, 0])) as DailyCounts;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function monthRange(period: Period) {
  return {
    gte: dateOnly(`${periodKey(period)}-01`),
    lte: dateOnly(`${periodKey(period)}-${String(daysInMonth(period)).padStart(2, "0")}`),
  };
}

function assertPeriod(period: Partial<Period>): asserts period is Period {
  if (!isValidPeriod(period)) throw new PhiDailyAttendanceError("INVALID_PERIOD", "Select a valid month.");
}

const rowSelect = {
  id: true,
  phiUserId: true,
  attendanceDate: true,
  halfDayEmployees: true,
  halfDayGrassCutters: true,
  halfDaySupervisors: true,
  absentEmployees: true,
  absentGrassCutters: true,
  absentSupervisors: true,
  remark: true,
  updatedAt: true,
} as const;

type DailyRecord = Prisma.PhiDailyAttendanceGetPayload<{ select: typeof rowSelect }>;

function serialize(record: DailyRecord) {
  return {
    id: record.id,
    date: record.attendanceDate.toISOString().slice(0, 10),
    counts: Object.fromEntries(PHI_DAILY_FIELDS.map((field) => [field, record[field]])) as DailyCounts,
    remark: record.remark,
    updatedAt: record.updatedAt,
  };
}

/** Daily attendance of one PHI (or every PHI for the DR) for a month. */
export async function listDailyAttendance(
  db: Pick<PrismaClient, "phiDailyAttendance">,
  actor: Actor,
  period: Partial<Period>,
  phiUserId?: string,
) {
  assertPeriod(period);
  if (actor.role !== "PHI" && actor.role !== "DEPUTY_REGISTRAR") {
    throw new PhiDailyAttendanceError("ACCESS_DENIED", "You do not have permission to view the PHI attendance.", 403);
  }
  const owner = actor.role === "PHI" ? actor.id : phiUserId;
  const records = await db.phiDailyAttendance.findMany({
    where: { attendanceDate: monthRange(period), ...(owner ? { phiUserId: owner } : {}) },
    orderBy: [{ attendanceDate: "asc" }],
    select: rowSelect,
  });
  return records.map(serialize);
}

/** Totals of the month by monthly-report category (feeds "Load totals from daily attendance"). */
export function totalsByCategory(rows: readonly { counts: DailyCounts }[]) {
  const totals = Object.fromEntries(PHI_MONTHLY_ATTENDANCE_CATEGORIES.map((category) => [category.key, 0])) as Record<PhiMonthlyAttendanceCategory, number>;
  for (const row of rows) {
    for (const category of PHI_MONTHLY_ATTENDANCE_CATEGORIES) {
      totals[category.key] += row.counts[PHI_DAILY_FIELD_BY_CATEGORY[category.key]];
    }
  }
  return totals;
}

function parseCount(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) {
    throw new PhiDailyAttendanceError("INVALID_VALUE", `${field} must be a whole number of 0 or more.`);
  }
  return parsed;
}

export async function saveDailyAttendance(
  db: Pick<PrismaClient, "phiDailyAttendance" | "phiMonthlyAttendanceReport" | "activityLog" | "$transaction">,
  actor: Actor,
  input: { date?: unknown; counts?: unknown; remark?: unknown },
) {
  if (!actor.active || actor.role !== "PHI") {
    throw new PhiDailyAttendanceError("ACCESS_DENIED", "Only PHI logins can enter the daily attendance.", 403);
  }
  const date = typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : "";
  if (!date || Number.isNaN(dateOnly(date).getTime()) || dateOnly(date).toISOString().slice(0, 10) !== date) {
    throw new PhiDailyAttendanceError("INVALID_DATE", "Select a valid date.");
  }
  if (date > getBusinessDateString()) {
    throw new PhiDailyAttendanceError("FUTURE_DATE", "Attendance cannot be entered for a future date.");
  }

  const source = typeof input.counts === "object" && input.counts !== null ? (input.counts as Record<string, unknown>) : {};
  const counts = Object.fromEntries(PHI_DAILY_FIELDS.map((field) => [field, parseCount(source[field], field)])) as DailyCounts;
  const remark = typeof input.remark === "string" ? input.remark.trim().slice(0, 300) || null : null;
  const period = { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };

  return db.$transaction(async (tx) => {
    const monthly = await tx.phiMonthlyAttendanceReport.findUnique({
      where: { phiUserId_month_year: { phiUserId: actor.id, month: period.month, year: period.year } },
      select: { status: true },
    });
    if (monthly && isPhiMonthlyAttendanceLocked(monthly.status)) {
      throw new PhiDailyAttendanceError(
        "MONTH_LOCKED",
        "The monthly attendance report of this month has been sent to the Deputy Registrar, so the daily sheet is locked.",
        409,
      );
    }

    const record = await tx.phiDailyAttendance.upsert({
      where: { phiUserId_attendanceDate: { phiUserId: actor.id, attendanceDate: dateOnly(date) } },
      create: { phiUserId: actor.id, attendanceDate: dateOnly(date), ...counts, remark },
      update: { ...counts, remark },
      select: rowSelect,
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "PHI_DAILY_ATTENDANCE_SAVED",
        entityType: "PhiDailyAttendance",
        entityId: record.id,
        description: `Saved the attendance of ${date}.`,
        metadata: { date, ...counts } as Prisma.InputJsonValue,
      },
    });

    return serialize(record);
  });
}
