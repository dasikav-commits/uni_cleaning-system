import { Prisma, type ActivityAction, type PrismaClient } from "@/app/generated/prisma/client";

/**
 * GAA management of cleaning workers and the locations they are assigned to.
 *
 * Active assignments of active workers make up the "total workers" a PHI sees
 * when recording daily attendance for a location, and each assignment carries
 * the worker's monthly allocated amount for that location.
 */

export class WorkerManagementError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "WorkerManagementError";
    this.code = code;
    this.status = status;
  }
}

type Actor = { id: string; name: string };

export type WorkerAssignmentItem = {
  id: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  locationActive: boolean;
  allocatedAmount: string;
  active: boolean;
  updatedAt: string;
};

export type CleaningWorkerItem = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  assignments: WorkerAssignmentItem[];
};

export type WorkerLocationOption = { id: string; code: string; name: string; active: boolean };

export type WorkerListFilters = {
  query?: string;
  status?: string;
  locationId?: string;
};

const MAX_ALLOCATION = new Prisma.Decimal("9999999999999.99");

const workerSelect = {
  id: true,
  name: true,
  active: true,
  createdAt: true,
  locationAssignments: {
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      allocatedAmount: true,
      active: true,
      updatedAt: true,
      location: { select: { id: true, code: true, name: true, active: true } },
    },
  },
} satisfies Prisma.CleaningWorkerSelect;

type WorkerRecord = Prisma.CleaningWorkerGetPayload<{ select: typeof workerSelect }>;

function serializeWorker(worker: WorkerRecord): CleaningWorkerItem {
  return {
    id: worker.id,
    name: worker.name,
    active: worker.active,
    createdAt: worker.createdAt.toISOString(),
    assignments: worker.locationAssignments.map((assignment) => ({
      id: assignment.id,
      locationId: assignment.location.id,
      locationCode: assignment.location.code,
      locationName: assignment.location.name,
      locationActive: assignment.location.active,
      allocatedAmount: assignment.allocatedAmount.toFixed(2),
      active: assignment.active,
      updatedAt: assignment.updatedAt.toISOString(),
    })),
  };
}

export function normalizeWorkerName(value: unknown) {
  const name = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 120) {
    throw new WorkerManagementError("INVALID_NAME", "Worker name must be between 2 and 120 characters.");
  }
  return name;
}

export function parseAllocatedAmount(value: unknown) {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    throw new WorkerManagementError(
      "INVALID_AMOUNT",
      "Allocated amount must be a positive number with at most two decimal places.",
    );
  }
  const amount = new Prisma.Decimal(text);
  if (amount.gt(MAX_ALLOCATION)) {
    throw new WorkerManagementError("INVALID_AMOUNT", "Allocated amount is too large.");
  }
  return amount;
}

async function log(
  tx: Pick<PrismaClient, "activityLog">,
  actor: Actor,
  action: ActivityAction,
  entityType: "CleaningWorker" | "WorkerLocationAssignment",
  entityId: string,
  description: string,
  metadata: Record<string, unknown>,
) {
  await tx.activityLog.create({
    data: { userId: actor.id, action, entityType, entityId, description, metadata: metadata as Prisma.InputJsonValue },
  });
}

async function requireActiveLocation(prisma: Pick<PrismaClient, "location">, locationId: string) {
  if (!locationId) throw new WorkerManagementError("LOCATION_REQUIRED", "Select a location.");
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, code: true, name: true, active: true },
  });
  if (!location) throw new WorkerManagementError("LOCATION_NOT_FOUND", "Location not found.", 404);
  if (!location.active) {
    throw new WorkerManagementError("LOCATION_INACTIVE", "Workers can only be assigned to active locations.", 409);
  }
  return location;
}

async function getWorker(prisma: Pick<PrismaClient, "cleaningWorker">, workerId: string) {
  const worker = await prisma.cleaningWorker.findUnique({ where: { id: workerId }, select: workerSelect });
  if (!worker) throw new WorkerManagementError("WORKER_NOT_FOUND", "Cleaning worker not found.", 404);
  return worker;
}

export async function listCleaningWorkers(
  prisma: Pick<PrismaClient, "cleaningWorker">,
  filters: WorkerListFilters = {},
): Promise<CleaningWorkerItem[]> {
  const query = filters.query?.trim();
  const where: Prisma.CleaningWorkerWhereInput = {
    ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    ...(filters.status === "active" ? { active: true } : filters.status === "inactive" ? { active: false } : {}),
    ...(filters.locationId
      ? { locationAssignments: { some: { locationId: filters.locationId, active: true } } }
      : {}),
  };
  const workers = await prisma.cleaningWorker.findMany({
    where,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    take: 500,
    select: workerSelect,
  });
  return workers.map(serializeWorker);
}

export async function listWorkerLocationOptions(
  prisma: Pick<PrismaClient, "location">,
): Promise<WorkerLocationOption[]> {
  return prisma.location.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, active: true },
  });
}

export async function createCleaningWorker(
  prisma: Pick<PrismaClient, "cleaningWorker" | "location" | "activityLog" | "$transaction">,
  actor: Actor,
  input: { name: unknown; locationId?: unknown; allocatedAmount?: unknown },
) {
  const name = normalizeWorkerName(input.name);
  const locationId = typeof input.locationId === "string" ? input.locationId : "";
  const location = locationId ? await requireActiveLocation(prisma, locationId) : null;
  const allocatedAmount = location ? parseAllocatedAmount(input.allocatedAmount) : null;

  const worker = await prisma.$transaction(async (tx) => {
    const created = await tx.cleaningWorker.create({
      data: {
        name,
        ...(location && allocatedAmount
          ? { locationAssignments: { create: { locationId: location.id, allocatedAmount } } }
          : {}),
      },
      select: workerSelect,
    });
    await log(tx, actor, "WORKER_CREATED", "CleaningWorker", created.id, `Created cleaning worker ${name}.`, { name });
    const assignment = created.locationAssignments[0];
    if (assignment && location) {
      await log(tx, actor, "WORKER_ASSIGNED", "WorkerLocationAssignment", assignment.id, `Assigned ${name} to ${location.code}.`, {
        workerId: created.id,
        locationId: location.id,
        allocatedAmount: assignment.allocatedAmount.toFixed(2),
      });
    }
    return created;
  });

  return serializeWorker(worker);
}

export async function updateCleaningWorker(
  prisma: Pick<PrismaClient, "cleaningWorker" | "workerLocationAssignment" | "activityLog" | "$transaction">,
  actor: Actor,
  workerId: string,
  input: { name?: unknown; active?: unknown },
) {
  const existing = await getWorker(prisma, workerId);
  const name = input.name === undefined ? existing.name : normalizeWorkerName(input.name);
  const active = typeof input.active === "boolean" ? input.active : existing.active;
  if (name === existing.name && active === existing.active) return serializeWorker(existing);

  const worker = await prisma.$transaction(async (tx) => {
    // A deactivated worker no longer counts towards any location's workforce.
    if (!active && existing.active) {
      await tx.workerLocationAssignment.updateMany({ where: { workerId, active: true }, data: { active: false } });
    }
    const updated = await tx.cleaningWorker.update({ where: { id: workerId }, data: { name, active }, select: workerSelect });
    if (name !== existing.name) {
      await log(tx, actor, "WORKER_UPDATED", "CleaningWorker", workerId, `Renamed cleaning worker ${existing.name} to ${name}.`, {
        previousName: existing.name,
        name,
      });
    }
    if (active !== existing.active) {
      await log(
        tx,
        actor,
        active ? "WORKER_ACTIVATED" : "WORKER_DEACTIVATED",
        "CleaningWorker",
        workerId,
        `${active ? "Activated" : "Deactivated"} cleaning worker ${name}.`,
        {
          name,
          ...(!active
            ? { deactivatedAssignmentIds: existing.locationAssignments.filter((item) => item.active).map((item) => item.id) }
            : {}),
        },
      );
    }
    return updated;
  });

  return serializeWorker(worker);
}

/** Assigns a worker to a location, or re-activates / re-prices an existing assignment. */
export async function assignWorkerToLocation(
  prisma: Pick<PrismaClient, "cleaningWorker" | "location" | "workerLocationAssignment" | "activityLog" | "$transaction">,
  actor: Actor,
  workerId: string,
  input: { locationId: unknown; allocatedAmount: unknown },
) {
  const worker = await getWorker(prisma, workerId);
  if (!worker.active) {
    throw new WorkerManagementError("WORKER_INACTIVE", "Activate the worker before assigning a location.", 409);
  }
  const location = await requireActiveLocation(prisma, typeof input.locationId === "string" ? input.locationId : "");
  const allocatedAmount = parseAllocatedAmount(input.allocatedAmount);
  const existing = worker.locationAssignments.find((item) => item.location.id === location.id);
  if (existing?.active) {
    throw new WorkerManagementError(
      "ALREADY_ASSIGNED",
      `${worker.name} is already assigned to ${location.code}. Edit the existing assignment instead.`,
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    const assignment = await tx.workerLocationAssignment.upsert({
      where: { workerId_locationId: { workerId, locationId: location.id } },
      create: { workerId, locationId: location.id, allocatedAmount },
      update: { active: true, allocatedAmount },
      select: { id: true },
    });
    await log(
      tx,
      actor,
      existing ? "WORKER_ASSIGNMENT_ACTIVATED" : "WORKER_ASSIGNED",
      "WorkerLocationAssignment",
      assignment.id,
      `${existing ? "Re-assigned" : "Assigned"} ${worker.name} to ${location.code}.`,
      {
        workerId,
        locationId: location.id,
        allocatedAmount: allocatedAmount.toFixed(2),
        ...(existing ? { previousAllocatedAmount: existing.allocatedAmount.toFixed(2) } : {}),
      },
    );
  });

  return serializeWorker(await getWorker(prisma, workerId));
}

export async function updateWorkerAssignment(
  prisma: Pick<PrismaClient, "cleaningWorker" | "workerLocationAssignment" | "activityLog" | "$transaction">,
  actor: Actor,
  assignmentId: string,
  input: { allocatedAmount?: unknown; active?: unknown },
) {
  const existing = await prisma.workerLocationAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      workerId: true,
      allocatedAmount: true,
      active: true,
      worker: { select: { name: true, active: true } },
      location: { select: { id: true, code: true, active: true } },
    },
  });
  if (!existing) throw new WorkerManagementError("ASSIGNMENT_NOT_FOUND", "Worker assignment not found.", 404);

  const allocatedAmount =
    input.allocatedAmount === undefined ? existing.allocatedAmount : parseAllocatedAmount(input.allocatedAmount);
  const active = typeof input.active === "boolean" ? input.active : existing.active;
  if (active && !existing.active) {
    if (!existing.worker.active) {
      throw new WorkerManagementError("WORKER_INACTIVE", "Activate the worker before re-activating this assignment.", 409);
    }
    if (!existing.location.active) {
      throw new WorkerManagementError("LOCATION_INACTIVE", "Workers can only be assigned to active locations.", 409);
    }
  }
  const amountChanged = !allocatedAmount.equals(existing.allocatedAmount);

  if (amountChanged || active !== existing.active) {
    await prisma.$transaction(async (tx) => {
      await tx.workerLocationAssignment.update({ where: { id: assignmentId }, data: { allocatedAmount, active } });
      if (amountChanged) {
        await log(
          tx,
          actor,
          "WORKER_ASSIGNMENT_UPDATED",
          "WorkerLocationAssignment",
          assignmentId,
          `Changed ${existing.worker.name}'s allocation at ${existing.location.code} to ${allocatedAmount.toFixed(2)}.`,
          {
            workerId: existing.workerId,
            locationId: existing.location.id,
            previousAllocatedAmount: existing.allocatedAmount.toFixed(2),
            allocatedAmount: allocatedAmount.toFixed(2),
          },
        );
      }
      if (active !== existing.active) {
        await log(
          tx,
          actor,
          active ? "WORKER_ASSIGNMENT_ACTIVATED" : "WORKER_ASSIGNMENT_DEACTIVATED",
          "WorkerLocationAssignment",
          assignmentId,
          `${active ? "Re-assigned" : "Removed"} ${existing.worker.name} ${active ? "to" : "from"} ${existing.location.code}.`,
          { workerId: existing.workerId, locationId: existing.location.id },
        );
      }
    });
  }

  return serializeWorker(await getWorker(prisma, existing.workerId));
}
