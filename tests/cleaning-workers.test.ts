import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import {
  assignWorkerToLocation,
  createCleaningWorker,
  parseAllocatedAmount,
  updateCleaningWorker,
  updateWorkerAssignment,
} from "@/lib/cleaning-workers";

const actor = { id: "gaa-1", name: "GAA" };
const location = { id: "loc-1", code: "LIB", name: "Library", active: true };

function workerRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "worker-1",
    name: "Nimal Perera",
    active: true,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    locationAssignments: [] as unknown[],
    ...overrides,
  };
}

function assignmentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1",
    allocatedAmount: new Prisma.Decimal("25000"),
    active: true,
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    location,
    ...overrides,
  };
}

function createMock() {
  const mock = {
    cleaningWorker: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    location: { findUnique: vi.fn().mockResolvedValue(location) },
    workerLocationAssignment: { findUnique: vi.fn(), upsert: vi.fn().mockResolvedValue({ id: "assignment-1" }), update: vi.fn(), updateMany: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation(async (callback: (tx: typeof mock) => Promise<unknown>) => callback(mock));
  return mock;
}

describe("cleaning worker management", () => {
  let prisma: ReturnType<typeof createMock>;

  beforeEach(() => {
    prisma = createMock();
  });

  it("validates allocated amounts", () => {
    expect(parseAllocatedAmount("25000").toFixed(2)).toBe("25000.00");
    expect(parseAllocatedAmount("1250.5").toFixed(2)).toBe("1250.50");
    for (const value of ["-1", "abc", "1.234", "", "1e5"]) {
      expect(() => parseAllocatedAmount(value)).toThrow(expect.objectContaining({ code: "INVALID_AMOUNT" }));
    }
  });

  it("creates a worker with an initial location assignment and audit entries", async () => {
    prisma.cleaningWorker.create.mockResolvedValue(workerRecord({ locationAssignments: [assignmentRecord()] }));

    const worker = await createCleaningWorker(prisma as never, actor, { name: "  Nimal   Perera ", locationId: "loc-1", allocatedAmount: "25000" });

    expect(prisma.cleaningWorker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Nimal Perera", locationAssignments: { create: { locationId: "loc-1", allocatedAmount: expect.any(Prisma.Decimal) } } },
      }),
    );
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "WORKER_CREATED" }) });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "WORKER_ASSIGNED" }) });
    expect(worker.assignments[0]?.allocatedAmount).toBe("25000.00");
  });

  it("refuses to assign workers to inactive locations", async () => {
    prisma.location.findUnique.mockResolvedValue({ ...location, active: false });
    await expect(
      createCleaningWorker(prisma as never, actor, { name: "Nimal", locationId: "loc-1", allocatedAmount: "100" }),
    ).rejects.toMatchObject({ code: "LOCATION_INACTIVE", status: 409 });
    expect(prisma.cleaningWorker.create).not.toHaveBeenCalled();
  });

  it("removes a deactivated worker from all locations", async () => {
    prisma.cleaningWorker.findUnique.mockResolvedValue(workerRecord({ locationAssignments: [assignmentRecord()] }));
    prisma.cleaningWorker.update.mockResolvedValue(workerRecord({ active: false, locationAssignments: [assignmentRecord({ active: false })] }));

    const worker = await updateCleaningWorker(prisma as never, actor, "worker-1", { active: false });

    expect(prisma.workerLocationAssignment.updateMany).toHaveBeenCalledWith({ where: { workerId: "worker-1", active: true }, data: { active: false } });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "WORKER_DEACTIVATED", metadata: expect.objectContaining({ deactivatedAssignmentIds: ["assignment-1"] }) }),
    });
    expect(worker.active).toBe(false);
  });

  it("rejects duplicate active assignments and re-activates removed ones", async () => {
    prisma.cleaningWorker.findUnique.mockResolvedValue(workerRecord({ locationAssignments: [assignmentRecord()] }));
    await expect(
      assignWorkerToLocation(prisma as never, actor, "worker-1", { locationId: "loc-1", allocatedAmount: "100" }),
    ).rejects.toMatchObject({ code: "ALREADY_ASSIGNED" });

    prisma.cleaningWorker.findUnique.mockResolvedValue(workerRecord({ locationAssignments: [assignmentRecord({ active: false })] }));
    await assignWorkerToLocation(prisma as never, actor, "worker-1", { locationId: "loc-1", allocatedAmount: "30000" });
    expect(prisma.workerLocationAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workerId_locationId: { workerId: "worker-1", locationId: "loc-1" } }, update: { active: true, allocatedAmount: expect.any(Prisma.Decimal) } }),
    );
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "WORKER_ASSIGNMENT_ACTIVATED", metadata: expect.objectContaining({ previousAllocatedAmount: "25000.00" }) }),
    });
  });

  it("does not assign inactive workers", async () => {
    prisma.cleaningWorker.findUnique.mockResolvedValue(workerRecord({ active: false }));
    await expect(
      assignWorkerToLocation(prisma as never, actor, "worker-1", { locationId: "loc-1", allocatedAmount: "100" }),
    ).rejects.toMatchObject({ code: "WORKER_INACTIVE" });
  });

  it("logs allocation changes with the previous amount", async () => {
    prisma.workerLocationAssignment.findUnique.mockResolvedValue({
      id: "assignment-1",
      workerId: "worker-1",
      allocatedAmount: new Prisma.Decimal("25000"),
      active: true,
      worker: { name: "Nimal", active: true },
      location,
    });
    prisma.cleaningWorker.findUnique.mockResolvedValue(workerRecord({ locationAssignments: [assignmentRecord({ allocatedAmount: new Prisma.Decimal("27500") })] }));

    await updateWorkerAssignment(prisma as never, actor, "assignment-1", { allocatedAmount: "27500" });

    expect(prisma.workerLocationAssignment.update).toHaveBeenCalledWith({
      where: { id: "assignment-1" },
      data: { allocatedAmount: expect.any(Prisma.Decimal), active: true },
    });
    expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "WORKER_ASSIGNMENT_UPDATED",
        metadata: expect.objectContaining({ previousAllocatedAmount: "25000.00", allocatedAmount: "27500.00" }),
      }),
    });
  });
});
