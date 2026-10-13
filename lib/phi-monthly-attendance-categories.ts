// Client-safe constants for the PHI monthly attendance report. This module must
// not import the Prisma client so it can be used from "use client" components.

export const PHI_MONTHLY_ATTENDANCE_CATEGORIES = [
  {
    key: "HALF_DAY_EMPLOYEES",
    label: "Half day employees",
    defaultRate: "800.00",
  },
  {
    key: "HALF_DAY_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR",
    label: "Half day Grass cutters/Gully cleaner/Tractor operator",
    defaultRate: "1370.00",
  },
  {
    key: "HALF_DAY_SUPERVISORS",
    label: "Half day Supervisors",
    defaultRate: "1370.00",
  },
  {
    key: "ABSENT_EMPLOYEES",
    label: "Absent employees",
    defaultRate: "1600.00",
  },
  {
    key: "ABSENT_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR",
    label: "Absent Grass cutters/Gully cleaner/Tractor operator",
    defaultRate: "2740.00",
  },
  {
    key: "ABSENT_SUPERVISORS",
    label: "Absent Supervisors",
    defaultRate: "2740.00",
  },
] as const;

export type PhiMonthlyAttendanceCategory = (typeof PHI_MONTHLY_ATTENDANCE_CATEGORIES)[number]["key"];

/** Statuses in which the PHI can no longer edit the report. */
export const PHI_MONTHLY_ATTENDANCE_LOCKED_STATUSES = ["SUBMITTED", "RESUBMITTED", "ADMIN_APPROVED", "ADMIN_REJECTED"] as const;

export function isPhiMonthlyAttendanceLocked(status: string | null | undefined) {
  return (PHI_MONTHLY_ATTENDANCE_LOCKED_STATUSES as readonly string[]).includes(status ?? "");
}
