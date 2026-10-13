import type { Prisma, PrismaClient, UserRole } from "@/app/generated/prisma/client";
import {
  buildTaskSummaryRows,
  collectLocationReportData,
  getReportingPeriodDates,
} from "@/lib/monthly-report-generation";

/**
 * Correction workflow for monthly evaluation reports.
 *
 * When Administration requests a correction, the report moves to
 * CORRECTION_REQUESTED. While it is in that state the assigned Evaluating
 * Officers and PHIs may edit the daily records of that location and month
 * (including past and finalized entries). An assigned Evaluating Officer or a
 * GAA then resubmits the report, which rebuilds the summaries from the
 * corrected records and returns it to Administration as RESUBMITTED.
 */

type Actor = { id: string; name: string; role: UserRole; active: boolean };

export class MonthlyReportCorrectionError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "MonthlyReportCorrectionError";
    this.code = code;
    this.status = status;
  }
}

function monthOf(dateString: string) {
  const [year, month] = dateString.split("-").map(Number);
  return { year, month };
}

export type PastEditMode = "CORRECTION" | "BACKFILL";

export type PastEditWindow = {
  mode: PastEditMode;
  reportId: string;
  month: number;
  year: number;
};

/**
 * Decides whether daily records for a past date (YYYY-MM-DD) at a location may
 * still be changed, based on that month's monitoring report:
 * - CORRECTION_REQUESTED: Administration asked for corrections, so records of
 *   that month may be edited, including finalized ones ("CORRECTION").
 * - DRAFT: the report was generated but is incomplete, so missing records may
 *   be filled in and unfinalized ones edited ("BACKFILL"). GAA then re-runs
 *   monthly processing to submit it.
 * Returns null when no such report exists (the month is closed for edits).
 */
export async function getPastEditWindow(
  prisma: Pick<PrismaClient, "monthlyEvaluationReport">,
  locationId: string,
  dateString: string,
): Promise<PastEditWindow | null> {
  const { year, month } = monthOf(dateString);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;

  const report = await prisma.monthlyEvaluationReport.findFirst({
    where: { locationId, month, year, status: { in: ["CORRECTION_REQUESTED", "DRAFT"] } },
    select: { id: true, status: true, month: true, year: true },
  });

  if (!report) return null;

  return {
    mode: report.status === "CORRECTION_REQUESTED" ? "CORRECTION" : "BACKFILL",
    reportId: report.id,
    month: report.month,
    year: report.year,
  };
}

/** The report covering `dateString` (any status), or null if none exists yet. */
export async function getReportForDate(
  prisma: Pick<PrismaClient, "monthlyEvaluationReport">,
  locationId: string,
  dateString: string,
) {
  const { year, month } = monthOf(dateString);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  return prisma.monthlyEvaluationReport.findFirst({
    where: { locationId, month, year },
    select: { id: true, status: true },
  });
}

export async function canResubmitCorrectedReport(
  prisma: Pick<PrismaClient, "evaluatingOfficerAssignment">,
  actor: Pick<Actor, "id" | "role" | "active">,
  locationId: string,
) {
  if (!actor.active) return false;
  if (actor.role === "GAA") return true;
  if (actor.role !== "EVALUATING_OFFICER") return false;

  const assignment = await prisma.evaluatingOfficerAssignment.findFirst({
    where: { userId: actor.id, locationId, active: true },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function resubmitCorrectedReport(prisma: PrismaClient, actor: Actor, reportId: string) {
  const report = await prisma.monthlyEvaluationReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      status: true,
      month: true,
      year: true,
      locationId: true,
      location: { select: { id: true, name: true } },
    },
  });

  if (!report) {
    throw new MonthlyReportCorrectionError("NOT_FOUND", "Monthly report was not found.", 404);
  }

  if (!(await canResubmitCorrectedReport(prisma, actor, report.locationId))) {
    throw new MonthlyReportCorrectionError(
      "ACCESS_DENIED",
      "Only a GAA or an Evaluating Officer assigned to this location can resubmit the report.",
      403,
    );
  }

  if (report.status !== "CORRECTION_REQUESTED") {
    throw new MonthlyReportCorrectionError(
      "NOT_CORRECTABLE",
      "Only reports with a correction request can be resubmitted.",
      409,
    );
  }

  const dates = getReportingPeriodDates({ month: report.month, year: report.year });
  const data = await collectLocationReportData(prisma, dates, report.location);

  if (!data.complete) {
    throw new MonthlyReportCorrectionError(
      "INCOMPLETE_REPORT",
      `The report is still incomplete and cannot be resubmitted: ${data.processingError}`,
      409,
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const changed = await tx.monthlyEvaluationReport.updateMany({
      where: { id: report.id, status: "CORRECTION_REQUESTED" },
      data: {
        status: "RESUBMITTED",
        isComplete: true,
        processingError: null,
        generatedAt: now,
        resubmittedAt: now,
        attendanceHistory: data.attendanceHistory as unknown as Prisma.InputJsonValue,
      },
    });

    if (changed.count !== 1) {
      throw new MonthlyReportCorrectionError(
        "NOT_CORRECTABLE",
        "This report has already been resubmitted.",
        409,
      );
    }

    await tx.monthlyTaskSummary.deleteMany({ where: { reportId: report.id } });
    if (data.summaries.length) {
      await tx.monthlyTaskSummary.createMany({ data: buildTaskSummaryRows(report.id, data.summaries) });
    }

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "REPORT_RESUBMITTED",
        entityType: "MonthlyEvaluationReport",
        entityId: report.id,
        description: "Corrected monthly evaluation report resubmitted for Administration review.",
        metadata: {
          month: report.month,
          year: report.year,
          locationId: report.locationId,
          previousStatus: "CORRECTION_REQUESTED",
          status: "RESUBMITTED",
        } as Prisma.InputJsonValue,
      },
    });

    const administrators = await tx.user.findMany({
      where: { role: "ADMINISTRATION_OFFICER", active: true },
      select: { id: true },
    });

    for (const administrator of administrators) {
      await tx.notification.create({
        data: {
          recipientUserId: administrator.id,
          event: "MONTHLY_REPORT_AUTOMATICALLY_SUBMITTED",
          title: "Monthly Report Resubmitted",
          message: `${report.location.name} - ${dates.label} monthly report has been corrected and resubmitted for Administration review by ${actor.name}.`,
          entityType: "MonthlyEvaluationReport",
          entityId: report.id,
          dedupeKey: `monthly-report-resubmitted:${report.id}:${now.getTime()}:${administrator.id}`,
          metadata: {
            reportId: report.id,
            locationId: report.locationId,
            month: report.month,
            year: report.year,
            status: "RESUBMITTED",
          } as Prisma.InputJsonValue,
        },
      });
    }

    return { id: report.id, status: "RESUBMITTED" as const, resubmittedAt: now };
  });
}
