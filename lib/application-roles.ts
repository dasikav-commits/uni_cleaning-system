// Client-safe role and category metadata (no Prisma client import).

export const applicationRoles = [
  "DEPUTY_REGISTRAR",
  "PHI",
  "FACULTY_COORDINATOR",
  "SUB_WARDEN",
  "CURATOR",
  "UNIT_OFFICER",
] as const;

export type ApplicationRole = (typeof applicationRoles)[number];

export function isApplicationRole(role: string): role is ApplicationRole {
  return (applicationRoles as readonly string[]).includes(role);
}

export const roleLabels: Record<ApplicationRole, string> = {
  DEPUTY_REGISTRAR: "Deputy Registrar (DR)",
  PHI: "PHI",
  FACULTY_COORDINATOR: "Faculty Coordinator",
  SUB_WARDEN: "Sub-Warden",
  CURATOR: "Curator",
  UNIT_OFFICER: "Unit Officer",
};

export const roleDescriptions: Record<ApplicationRole, string> = {
  DEPUTY_REGISTRAR:
    "Administrator. Manages logins, locations and the BOQ, gathers the evaluation reports and prepares the Amount of Work Done, Attendance and Cleaning & Janitorial Services reports.",
  PHI: "Daily and monthly attendance, the Main Administration Building report and the external reports (garbage, toilet pits, dogs & cats).",
  FACULTY_COORDINATOR: "Evaluation reports of the assigned faculties.",
  SUB_WARDEN: "Evaluation reports of the assigned halls.",
  CURATOR: "Evaluation report of the land, roads & landscape.",
  UNIT_OFFICER: "Evaluation reports of the assigned units (auditorium, library, medical centre, ...).",
};

/** Roles that submit evaluation reports for assigned locations. */
export const reportingRoles = applicationRoles.filter((role) => role !== "DEPUTY_REGISTRAR");

export function roleLabel(role: string) {
  return isApplicationRole(role) ? roleLabels[role] : role;
}

export const locationCategories = [
  "FACULTY",
  "ADMINISTRATION",
  "HALL",
  "COMMON_UNIT",
  "LANDSCAPE",
  "EXTERNAL_SERVICE",
] as const;

export type LocationCategoryKey = (typeof locationCategories)[number];

export const locationCategoryLabels: Record<LocationCategoryKey, string> = {
  FACULTY: "Faculties",
  ADMINISTRATION: "Administration",
  HALL: "Halls",
  COMMON_UNIT: "Units",
  LANDSCAPE: "Land, roads & landscape",
  EXTERNAL_SERVICE: "External services",
};

/** The login that normally reports each kind of location. */
export const suggestedRoleForCategory: Record<LocationCategoryKey, ApplicationRole> = {
  FACULTY: "FACULTY_COORDINATOR",
  ADMINISTRATION: "PHI",
  HALL: "SUB_WARDEN",
  COMMON_UNIT: "UNIT_OFFICER",
  LANDSCAPE: "CURATOR",
  EXTERNAL_SERVICE: "PHI",
};

export function isLocationCategory(value: string): value is LocationCategoryKey {
  return (locationCategories as readonly string[]).includes(value);
}
