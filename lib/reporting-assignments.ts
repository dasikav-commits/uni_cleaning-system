import type { Prisma, PrismaClient, UserRole } from "@/app/generated/prisma/client";
import { reportingRoles, roleLabel } from "@/lib/application-roles";

export type Actor = { id: string; name: string; role: UserRole; active: boolean };

export class ReportingAccessError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 403) {
    super(message);
    this.name = "ReportingAccessError";
    this.code = code;
    this.status = status;
  }
}

export function isDeputyRegistrar(actor: Pick<Actor, "role" | "active">) {
  return actor.active && actor.role === "DEPUTY_REGISTRAR";
}

export function assertDeputyRegistrar(actor: Pick<Actor, "role" | "active">) {
  if (!isDeputyRegistrar(actor)) {
    throw new ReportingAccessError("ACCESS_DENIED", "Only the Deputy Registrar can do this.");
  }
}

/** Locations the user may report on (the DR may see every location). */
export async function accessibleLocationIds(db: Pick<PrismaClient, "reportingAssignment">, actor: Actor) {
  if (isDeputyRegistrar(actor)) return null;
  if (!actor.active) return [];
  const assignments = await db.reportingAssignment.findMany({
    where: { userId: actor.id, active: true, location: { active: true } },
    select: { locationId: true },
  });
  return assignments.map((assignment) => assignment.locationId);
}

export async function canAccessLocation(db: Pick<PrismaClient, "reportingAssignment">, actor: Actor, locationId: string) {
  if (isDeputyRegistrar(actor)) return true;
  if (!actor.active) return false;
  const assignment = await db.reportingAssignment.findUnique({
    where: { userId_locationId: { userId: actor.id, locationId } },
    select: { active: true },
  });
  return Boolean(assignment?.active);
}

export async function assertLocationAccess(db: Pick<PrismaClient, "reportingAssignment">, actor: Actor, locationId: string) {
  if (!(await canAccessLocation(db, actor, locationId))) {
    throw new ReportingAccessError("ACCESS_DENIED", "This location is not assigned to your login.");
  }
}

/** Active users who report on a location (for notifications). */
export async function locationReporters(db: Pick<PrismaClient, "reportingAssignment">, locationId: string) {
  const assignments = await db.reportingAssignment.findMany({
    where: { locationId, active: true, user: { active: true } },
    select: { user: { select: { id: true, name: true, email: true } } },
  });
  return assignments.map((assignment) => assignment.user);
}

// ---------------------------------------------------------------------------
// DR: manage which login reports on which location
// ---------------------------------------------------------------------------

export async function listAssignmentBoard(db: Pick<PrismaClient, "location" | "user">) {
  const [locations, users] = await Promise.all([
    db.location.findMany({
      where: { active: true },
      orderBy: [{ boqNumber: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        shortName: true,
        boqNumber: true,
        category: true,
        reportingAssignments: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, user: { select: { id: true, name: true, email: true, role: true, active: true } } },
        },
      },
    }),
    db.user.findMany({
      where: { role: { in: [...reportingRoles] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, active: true },
    }),
  ]);
  return { locations, users };
}

export async function setReportingAssignment(
  db: Pick<PrismaClient, "$transaction">,
  actor: Actor,
  input: { userId: string; locationId: string; active: boolean },
) {
  assertDeputyRegistrar(actor);
  return db.$transaction(async (tx) => {
    const [user, location] = await Promise.all([
      tx.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, role: true } }),
      tx.location.findUnique({ where: { id: input.locationId }, select: { id: true, name: true } }),
    ]);
    if (!user || !location) {
      throw new ReportingAccessError("NOT_FOUND", "User or location not found.", 404);
    }
    if (!(reportingRoles as readonly string[]).includes(user.role)) {
      throw new ReportingAccessError(
        "INVALID_ROLE",
        `${roleLabel(user.role)} logins do not submit evaluation reports. The Deputy Registrar can already open every report.`,
        400,
      );
    }

    const assignment = await tx.reportingAssignment.upsert({
      where: { userId_locationId: { userId: user.id, locationId: location.id } },
      create: { userId: user.id, locationId: location.id, active: input.active },
      update: { active: input.active },
      select: { id: true, active: true },
    });

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "REPORTING_ASSIGNMENT_UPDATED",
        entityType: "ReportingAssignment",
        entityId: assignment.id,
        description: `${input.active ? "Assigned" : "Removed"} ${user.name} ${input.active ? "to" : "from"} ${location.name}.`,
        metadata: { userId: user.id, locationId: location.id, active: input.active } as Prisma.InputJsonValue,
      },
    });

    return assignment;
  });
}
