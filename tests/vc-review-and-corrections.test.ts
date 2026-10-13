import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";
import { provisionSelfServiceUser } from "@/lib/account-provisioning";
import { resubmitCorrectedReport } from "@/lib/monthly-report-corrections";
import { submitPaymentRecommendation, updateRecommendationRemarks } from "@/lib/payment-recommendations";
import { decideVcRecommendation } from "@/lib/vc-review";

type AnyMock = Record<string, Record<string, Mock> | Mock>;

function withTransaction<T extends AnyMock>(mock: T) {
  return { ...mock, $transaction: vi.fn(async (callback: (tx: T) => Promise<unknown>) => callback(mock)) };
}

const vc = { id: "vc-1", name: "Vice Chancellor", role: "VICE_CHANCELLOR" as const, active: true };
const gaa = { id: "gaa-1", name: "GAA", role: "GAA" as const, active: true };

describe("Vice Chancellor review", () => {
  let prisma: ReturnType<typeof createVcMock>;

  function createVcMock() {
    return withTransaction({
      paymentRecommendation: {
        findUnique: vi.fn().mockResolvedValue({
          id: "rec-1",
          status: "VC_PENDING",
          version: 1,
          reportId: "report-1",
          createdByUserId: "gaa-1",
          submittedByUserId: "gaa-2",
          report: { status: "ADMIN_APPROVED", month: 8, year: 2026, location: { name: "Library" } },
        }),
        update: vi.fn(async ({ data }: { data: { status: string } }) => ({ id: "rec-1", status: data.status, version: 1 })),
      },
      vCApproval: {
        create: vi.fn(async ({ data }: { data: { decision: string; remarks: string | null } }) => ({
          id: "approval-1",
          decision: data.decision,
          remarks: data.remarks,
          decidedAt: new Date(),
        })),
      },
      activityLog: { create: vi.fn() },
      notification: { create: vi.fn() },
    });
  }

  beforeEach(() => {
    prisma = createVcMock();
  });

  it("approves a pending recommendation, records the decision and notifies the GAA users", async () => {
    const result = await decideVcRecommendation(prisma as never, vc, "rec-1", "APPROVE", "");

    expect(result.status).toBe("VC_APPROVED");
    expect(prisma.paymentRecommendation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "rec-1", status: "VC_PENDING" }, data: { status: "VC_APPROVED" } }),
    );
    expect(prisma.vCApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ decision: "APPROVE", vcUserId: "vc-1" }) }),
    );
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "VC_APPROVED" }) });
    // Both the submitter and the creator are told about the decision.
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it("requires remarks to reject or request clarification", async () => {
    await expect(decideVcRecommendation(prisma as never, vc, "rec-1", "REJECT", "  ")).rejects.toMatchObject({ code: "REMARKS_REQUIRED" });
    await expect(decideVcRecommendation(prisma as never, vc, "rec-1", "CLARIFICATION", "")).rejects.toMatchObject({ code: "REMARKS_REQUIRED" });
    expect(prisma.paymentRecommendation.update).not.toHaveBeenCalled();
  });

  it("sends a recommendation back for clarification", async () => {
    const result = await decideVcRecommendation(prisma as never, vc, "rec-1", "CLARIFICATION", "Explain the extra task.");
    expect(result.status).toBe("CLARIFICATION_REQUESTED");
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ event: "VC_REQUESTED_CLARIFICATION" }),
    });
  });

  it("refuses decisions on recommendations that are not pending and from non-VC users", async () => {
    prisma.paymentRecommendation.findUnique.mockResolvedValueOnce({
      id: "rec-1",
      status: "VC_APPROVED",
      report: { status: "ADMIN_APPROVED", month: 8, year: 2026, location: { name: "Library" } },
    });
    await expect(decideVcRecommendation(prisma as never, vc, "rec-1", "APPROVE", "")).rejects.toMatchObject({ code: "LOCKED", status: 409 });
    await expect(decideVcRecommendation(prisma as never, gaa, "rec-1", "APPROVE", "")).rejects.toMatchObject({ code: "ACCESS_DENIED", status: 403 });
  });
});

describe("GAA resubmission after a Vice Chancellor decision", () => {
  it("lets the GAA edit and resubmit a recommendation returned for clarification", async () => {
    const recommendation = {
      id: "rec-1",
      reportId: "report-1",
      status: "CLARIFICATION_REQUESTED",
      report: { status: "ADMIN_APPROVED", month: 8, year: 2026, location: { name: "Library" } },
      taskCalculations: [
        {
          recommendationAmount: new Prisma.Decimal("1000"),
          completionPercentage: new Prisma.Decimal("90"),
          recommendedAmount: new Prisma.Decimal("900"),
          monthlyTaskSummary: { id: "summary-1" },
        },
      ],
    };
    const prisma = withTransaction({
      paymentRecommendation: {
        findUnique: vi.fn().mockResolvedValue(recommendation),
        update: vi.fn().mockResolvedValue({ id: "rec-1", status: "VC_PENDING", version: 2, remarks: "Clarified" }),
      },
      activityLog: { create: vi.fn() },
      user: { findMany: vi.fn().mockResolvedValue([{ id: "vc-1" }]) },
      notification: { create: vi.fn() },
    });

    await expect(updateRecommendationRemarks(prisma as never, gaa, "rec-1", "Clarified")).resolves.toBeTruthy();

    const result = await submitPaymentRecommendation(prisma as never, gaa, "rec-1");
    expect(result).toMatchObject({ status: "VC_PENDING", version: 2 });
    expect(prisma.paymentRecommendation.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "rec-1", status: "CLARIFICATION_REQUESTED" },
        data: expect.objectContaining({ status: "VC_PENDING", version: { increment: 1 } }),
      }),
    );
    // A new dedupe key per version, so the VC is notified about the resubmission.
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dedupeKey: "payment-recommendation-submitted:rec-1:v2:vc-1" }),
    });
  });
});

describe("monthly report correction resubmission", () => {
  const officer = { id: "officer-1", name: "Officer", role: "EVALUATING_OFFICER" as const, active: true };

  function createReportMock(attendanceDays: number) {
    const attendance = Array.from({ length: attendanceDays }, (_, index) => ({
      id: `att-${index + 1}`,
      attendanceDate: new Date(Date.UTC(2026, 1, index + 1, 12)),
      totalPresentCount: 5,
      phiUserId: "phi-1",
      remark: null,
      createdAt: new Date(),
      finalizedAt: null,
      lockedAt: null,
      phiUser: { id: "phi-1", name: "PHI" },
    }));
    return withTransaction({
      monthlyEvaluationReport: {
        findUnique: vi.fn().mockResolvedValue({
          id: "report-1",
          status: "CORRECTION_REQUESTED",
          month: 2,
          year: 2026,
          locationId: "loc-1",
          location: { id: "loc-1", name: "Library" },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      evaluatingOfficerAssignment: { findFirst: vi.fn().mockResolvedValue({ id: "assignment-1" }) },
      locationTask: { findMany: vi.fn().mockResolvedValue([]) },
      dailyCleaningEvaluation: { findMany: vi.fn().mockResolvedValue([]) },
      dailyAttendanceEvaluation: { findMany: vi.fn().mockResolvedValue(attendance) },
      monthlyTaskSummary: { deleteMany: vi.fn(), createMany: vi.fn() },
      activityLog: { create: vi.fn() },
      user: { findMany: vi.fn().mockResolvedValue([{ id: "admin-1" }]) },
      notification: { create: vi.fn() },
    });
  }

  it("rebuilds and resubmits a corrected, complete report", async () => {
    const prisma = createReportMock(28);
    const result = await resubmitCorrectedReport(prisma as never, officer, "report-1");

    expect(result.status).toBe("RESUBMITTED");
    expect(prisma.monthlyEvaluationReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-1", status: "CORRECTION_REQUESTED" },
        data: expect.objectContaining({ status: "RESUBMITTED", isComplete: true, resubmittedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "REPORT_RESUBMITTED" }) });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it("refuses to resubmit while records are still missing", async () => {
    const prisma = createReportMock(20);
    await expect(resubmitCorrectedReport(prisma as never, officer, "report-1")).rejects.toMatchObject({ code: "INCOMPLETE_REPORT", status: 409 });
    expect(prisma.monthlyEvaluationReport.updateMany).not.toHaveBeenCalled();
  });

  it("only allows a GAA or an assigned Evaluating Officer to resubmit", async () => {
    const prisma = createReportMock(28);
    prisma.evaluatingOfficerAssignment.findFirst.mockResolvedValue(null);
    await expect(resubmitCorrectedReport(prisma as never, officer, "report-1")).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(
      resubmitCorrectedReport(prisma as never, { id: "phi-1", name: "PHI", role: "PHI", active: true }, "report-1"),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(resubmitCorrectedReport(prisma as never, gaa, "report-1")).resolves.toMatchObject({ status: "RESUBMITTED" });
  });
});

describe("self-service account provisioning", () => {
  function createProvisionMock(activeGaaCount: number) {
    return withTransaction({
      $executeRaw: vi.fn().mockResolvedValue(1),
      user: {
        count: vi.fn().mockResolvedValue(activeGaaCount),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data),
      },
    });
  }

  it("creates requested non-GAA roles inactive, pending GAA approval", async () => {
    const prisma = createProvisionMock(1);
    const result = await provisionSelfServiceUser(prisma as never, { id: "u1", email: "a@b.c", name: "A", requestedRole: "PHI" });
    expect(result.pendingApproval).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "PHI", active: false }) });
  });

  it("never grants GAA automatically once an active GAA exists", async () => {
    const prisma = createProvisionMock(1);
    const result = await provisionSelfServiceUser(prisma as never, { id: "u1", email: "a@b.c", name: "A", requestedRole: "GAA" });
    expect(result).toMatchObject({ pendingApproval: true, bootstrapAdmin: false });
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "GAA", active: false }) });
  });

  it("activates the very first GAA so the system can be bootstrapped", async () => {
    const prisma = createProvisionMock(0);
    const result = await provisionSelfServiceUser(prisma as never, { id: "u1", email: "a@b.c", name: "A", requestedRole: "GAA" });
    expect(result).toMatchObject({ pendingApproval: false, bootstrapAdmin: true });
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "GAA", active: true }) });
  });

  it("does not trust an invalid requested role", async () => {
    const prisma = createProvisionMock(0);
    const result = await provisionSelfServiceUser(prisma as never, { id: "u1", email: "a@b.c", name: "A", requestedRole: "SUPERUSER" });
    expect(result.pendingApproval).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "EVALUATING_OFFICER", active: false }) });
  });
});
