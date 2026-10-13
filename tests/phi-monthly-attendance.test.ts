import { describe, expect, it, vi } from "vitest";
import {
  calculatePhiMonthlyAttendanceRows,
  decidePhiMonthlyAttendanceReport,
  savePhiMonthlyAttendanceReport,
  PHI_MONTHLY_ATTENDANCE_CATEGORIES,
  type PhiMonthlyAttendanceRowInput,
  PhiMonthlyAttendanceError,
} from "@/lib/phi-monthly-attendance";

function row(category: PhiMonthlyAttendanceRowInput["category"], employeeCount: number, deductionRate: number): PhiMonthlyAttendanceRowInput {
  return { category, employeeCount, deductionRate };
}

describe("PHI monthly attendance report calculations", () => {
  it("matches the March sample totals", () => {
    const { summaries, grandTotal } = calculatePhiMonthlyAttendanceRows([
      row("HALF_DAY_EMPLOYEES", 37, 800),
      row("HALF_DAY_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR", 0, 1370),
      row("HALF_DAY_SUPERVISORS", 1, 1370),
      row("ABSENT_EMPLOYEES", 413, 1600),
      row("ABSENT_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR", 45, 2740),
      row("ABSENT_SUPERVISORS", 3, 2740),
    ]);

    expect(summaries.map((summary) => summary.rowTotal.toFixed(2))).toEqual([
      "29600.00",
      "0.00",
      "1370.00",
      "660800.00",
      "123300.00",
      "8220.00",
    ]);
    expect(grandTotal.toFixed(2)).toBe("823290.00");
  });

  it("rejects negative employee counts", () => {
    expect(() =>
      calculatePhiMonthlyAttendanceRows([
        row("HALF_DAY_EMPLOYEES", -1, 800),
        row("HALF_DAY_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR", 0, 1370),
        row("HALF_DAY_SUPERVISORS", 1, 1370),
        row("ABSENT_EMPLOYEES", 413, 1600),
        row("ABSENT_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR", 45, 2740),
        row("ABSENT_SUPERVISORS", 3, 2740),
      ]),
    ).toThrow(PhiMonthlyAttendanceError);
  });

  it("keeps the official categories in the expected order", () => {
    expect(PHI_MONTHLY_ATTENDANCE_CATEGORIES.map((category) => category.key)).toEqual([
      "HALF_DAY_EMPLOYEES",
      "HALF_DAY_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR",
      "HALF_DAY_SUPERVISORS",
      "ABSENT_EMPLOYEES",
      "ABSENT_GRASS_CUTTERS_GULLY_CLEANER_TRACTOR_OPERATOR",
      "ABSENT_SUPERVISORS",
    ]);
  });
});

const phi = { id: "phi-1", name: "PHI One", role: "PHI" as const, active: true };
const fullRows = PHI_MONTHLY_ATTENDANCE_CATEGORIES.map((category) => ({
  category: category.key,
  employeeCount: 1,
  deductionRate: category.defaultRate,
}));

function workflowPrisma(existing: { id: string; status: string; generatedAt: Date | null } | null) {
  const tx = {
    phiMonthlyAttendanceReport: {
      findUnique: vi.fn(async () => existing),
      update: vi.fn(async () => ({ id: existing?.id ?? "report-1" })),
      create: vi.fn(async () => ({ id: "report-1" })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    phiMonthlyAttendanceSummary: { deleteMany: vi.fn(), createMany: vi.fn() },
    phiMonthlyAttendanceReview: { create: vi.fn(async () => ({ id: "review-1" })) },
    activityLog: { create: vi.fn() },
    user: { findMany: vi.fn(async () => [{ id: "admin-1" }]) },
    notification: { create: vi.fn() },
  };
  const prisma = {
    ...tx,
    phiMonthlyAttendanceReport: {
      ...tx.phiMonthlyAttendanceReport,
      // used by getPhiMonthlyAttendanceReport after saving
      findUnique: vi.fn(async () => ({ id: "report-1", phiUserId: "phi-1" })),
    },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  return { prisma, tx };
}

describe("PHI monthly attendance workflow", () => {
  it.each(["SUBMITTED", "RESUBMITTED"])("does not let the PHI edit a %s report that is awaiting review", async (status) => {
    const { prisma, tx } = workflowPrisma({ id: "report-1", status, generatedAt: new Date() });
    await expect(
      savePhiMonthlyAttendanceReport(prisma as never, phi, { month: 8, year: 2026, action: "save", rows: fullRows }),
    ).rejects.toMatchObject({ code: "REPORT_PENDING_REVIEW", status: 409 });
    expect(tx.phiMonthlyAttendanceReport.update).not.toHaveBeenCalled();
  });

  it("allows resubmission after a correction request with a fresh notification key", async () => {
    const { prisma, tx } = workflowPrisma({ id: "report-1", status: "CORRECTION_REQUESTED", generatedAt: new Date() });
    await savePhiMonthlyAttendanceReport(prisma as never, phi, { month: 8, year: 2026, action: "submit", rows: fullRows });

    expect(tx.phiMonthlyAttendanceReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "RESUBMITTED" }) }),
    );
    const notification = (tx.notification.create.mock.calls[0] as unknown as [{ data: { dedupeKey: string; message: string } }])[0].data;
    expect(notification.dedupeKey).not.toBe("phi-monthly-attendance-submitted:report-1:admin-1");
    expect(notification.dedupeKey).toMatch(/^phi-monthly-attendance-resubmitted:report-1:\d+:admin-1$/);
    expect(notification.message).toContain("August 2026");
  });

  it("rejects unknown or duplicated categories", async () => {
    const { prisma } = workflowPrisma(null);
    await expect(
      savePhiMonthlyAttendanceReport(prisma as never, phi, {
        month: 8,
        year: 2026,
        rows: [...fullRows, { ...fullRows[0] }],
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_CATEGORY" });
    await expect(
      savePhiMonthlyAttendanceReport(prisma as never, phi, {
        month: 8,
        year: 2026,
        rows: [...fullRows, { category: "BOGUS" as never, employeeCount: 1, deductionRate: 1 }],
      }),
    ).rejects.toMatchObject({ code: "INVALID_CATEGORY" });
  });

  it("notifies only GAA users and the owning PHI when a report is approved", async () => {
    const { prisma, tx } = workflowPrisma(null);
    tx.phiMonthlyAttendanceReport.findUnique.mockResolvedValue({
      id: "report-1",
      phiUserId: "phi-1",
      month: 8,
      year: 2026,
      status: "SUBMITTED",
      phiUser: { name: "PHI One" },
    } as never);
    await decidePhiMonthlyAttendanceReport(
      prisma as never,
      { id: "admin-1", name: "Admin", role: "ADMINISTRATION_OFFICER", active: true },
      "report-1",
      "APPROVE",
    );
    expect(tx.user.findMany).toHaveBeenCalledWith({
      where: { active: true, OR: [{ role: "GAA" }, { id: "phi-1" }] },
      select: { id: true },
    });
  });
});
