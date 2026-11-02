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

/** Column of the PHI daily attendance sheet that feeds each monthly category. */
export const PHI_DAILY_FIELD_BY_CATEGORY = {
  HALF_DAY_EMPLOYEES: "halfDayEmployees",
  HALF_DAY_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR: "halfDayGrassCutters",
  HALF_DAY_SUPERVISORS: "halfDaySupervisors",
  ABSENT_EMPLOYEES: "absentEmployees",
  ABSENT_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR: "absentGrassCutters",
  ABSENT_SUPERVISORS: "absentSupervisors",
} as const satisfies Record<PhiMonthlyAttendanceCategory, string>;

export type PhiDailyAttendanceField = (typeof PHI_DAILY_FIELD_BY_CATEGORY)[PhiMonthlyAttendanceCategory];

export const PHI_DAILY_FIELDS = Object.values(PHI_DAILY_FIELD_BY_CATEGORY) as PhiDailyAttendanceField[];

/** Short column headings for the daily attendance sheet. */
export const PHI_DAILY_FIELD_LABELS: Record<PhiDailyAttendanceField, string> = {
  halfDayEmployees: "Half day - employees",
  halfDayGrassCutters: "Half day - grass cutters / gully cleaner / tractor operator",
  halfDaySupervisors: "Half day - supervisors",
  absentEmployees: "Absent - employees",
  absentGrassCutters: "Absent - grass cutters / gully cleaner / tractor operator",
  absentSupervisors: "Absent - supervisors",
};

/** The Deputy Registrar reviews the PHI monthly attendance (statuses keep their historical names). */
export const PHI_MONTHLY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted to DR",
  RESUBMITTED: "Resubmitted to DR",
  CORRECTION_REQUESTED: "Correction requested",
  ADMIN_APPROVED: "Approved by DR",
  ADMIN_REJECTED: "Rejected by DR",
};

export function phiMonthlyStatusLabel(status: string) {
  return PHI_MONTHLY_STATUS_LABELS[status] ?? status;
}
