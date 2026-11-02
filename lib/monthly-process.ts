import type { EvaluationReportStatus, Prisma, PrismaClient } from "@/app/generated/prisma/client";
import type { EmailMessage } from "@/lib/email";
import { centsToDecimalString, formatMoney, summarizePaymentLines, toCents } from "@/lib/evaluation-calc";
import { locationBoqCents, serializeRow } from "@/lib/evaluation-reports";
import { activeUsersWithRole, notifyUsers } from "@/lib/notifications";
import { listDailyAttendance, totalsByCategory } from "@/lib/phi-daily-attendance";
import { PHI_MONTHLY_ATTENDANCE_CATEGORIES } from "@/lib/phi-monthly-attendance-categories";
import { comparePeriods, currentPeriod, isValidPeriod, periodLabel, type Period } from "@/lib/periods";
import { assertDeputyRegistrar, type Actor } from "@/lib/reporting-assignments";

export class MonthlyProcessError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "MonthlyProcessError";
    this.code = code;
    this.status = status;
  }
}

function assertPeriod(period: Partial<Period>): asserts period is Period {
  if (!isValidPeriod(period)) throw new MonthlyProcessError("INVALID_PERIOD", "Select a valid month.");
  if (comparePeriods(period, currentPeriod()) > 0) throw new MonthlyProcessError("FUTURE_PERIOD", "Select a month that has started.");
}

const APPROVED_PHI_STATUS = "ADMIN_APPROVED";
const PENDING_PHI_STATUSES = ["SUBMITTED", "RESUBMITTED", "CORRECTION_REQUESTED", "DRAFT"];

// ---------------------------------------------------------------------------
// Shared loaders
// ---------------------------------------------------------------------------

async function loadLocationsWithReports(db: Pick<PrismaClient, "location">, period: Period, withRows: boolean) {
  return db.location.findMany({
    where: { OR: [{ active: true }, { evaluationReports: { some: { year: period.year, month: period.month } } }] },
    orderBy: [{ boqNumber: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      boqNumber: true,
      boqDescription: true,
      category: true,
      evaluationFormat: true,
      boqAmount: true,
      active: true,
      boqItems: { where: { active: true }, select: { monthlyAmount: true } },
      evaluationReports: {
        where: { year: period.year, month: period.month },
        select: {
          id: true,
          status: true,
          boqTotal: true,
          deductionTotal: true,
          approvedTotal: true,
          submittedAt: true,
          reviewedAt: true,
          submittedBy: { select: { name: true } },
          ...(withRows
            ? {
                rows: {
                  orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
                  select: {
                    id: true,
                    boqItemId: true,
                    itemNo: true,
                    subItem: true,
                    description: true,
                    frequency: true,
                    sortOrder: true,
                    monthlyAmount: true,
                    unitRate: true,
                    unitLabel: true,
                    penaltyRate: true,
                    scheduledCount: true,
                    completedCount: true,
                    completedKeys: true,
                    quantity: true,
                    penaltyQuantity: true,
                    filled: true,
                    deductionPercent: true,
                    deductionAmount: true,
                    totalAmount: true,
                    remark: true,
                  },
                },
              }
            : {}),
        },
      },
    },
  });
}

async function loadPhiMonthlyReports(db: Pick<PrismaClient, "phiMonthlyAttendanceReport">, period: Period) {
  return db.phiMonthlyAttendanceReport.findMany({
    where: { year: period.year, month: period.month },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      grandTotal: true,
      submittedAt: true,
      resubmittedAt: true,
      finalizedAt: true,
      phiUser: { select: { id: true, name: true } },
      rows: { select: { category: true, employeeCount: true, deductionRate: true, rowTotal: true } },
    },
  });
}

function absenceCents(reports: readonly { status: string; grandTotal: unknown }[]) {
  return reports.filter((report) => report.status === APPROVED_PHI_STATUS).reduce((sum, report) => sum + toCents(report.grandTotal), 0);
}

// ---------------------------------------------------------------------------
// Process overview (DR dashboard)
// ---------------------------------------------------------------------------

export type StepState = "done" | "in-progress" | "waiting" | "blocked";

export async function getMonthlyOverview(
  db: Pick<PrismaClient, "location" | "phiMonthlyAttendanceReport" | "monthlyPaymentReport">,
  period: Partial<Period>,
) {
  assertPeriod(period);
  const [locations, phiReports, payment] = await Promise.all([
    loadLocationsWithReports(db, period, false),
    loadPhiMonthlyReports(db, period),
    db.monthlyPaymentReport.findUnique({ where: { year_month: period }, select: { id: true, status: true, payableTotal: true, finalizedAt: true, finalizedBy: { select: { name: true } } } }),
  ]);

  const active = locations.filter((location) => location.active);
  const counts: Record<EvaluationReportStatus | "NOT_STARTED", number> = { NOT_STARTED: 0, DRAFT: 0, SUBMITTED: 0, RETURNED: 0, ACCEPTED: 0 };
  for (const location of active) counts[location.evaluationReports[0]?.status ?? "NOT_STARTED"] += 1;

  const mainAdmin = active.filter((location) => location.category === "ADMINISTRATION");
  const mainAdminAccepted = mainAdmin.length > 0 && mainAdmin.every((location) => location.evaluationReports[0]?.status === "ACCEPTED");
  const phiApproved = phiReports.some((report) => report.status === APPROVED_PHI_STATUS);
  const phiPending = phiReports.filter((report) => report.status === "SUBMITTED" || report.status === "RESUBMITTED").length;
  const allAccepted = active.length > 0 && counts.ACCEPTED === active.length;
  const finalized = payment?.status === "FINALIZED";

  const steps: { key: string; title: string; description: string; state: StepState; detail: string; href: string }[] = [
    {
      key: "evaluations",
      title: "Evaluation reports",
      description: "Gather the evaluation cleaning reports of all locations from the faculty, hall, unit, curator and PHI logins.",
      state: allAccepted ? "done" : counts.SUBMITTED + counts.ACCEPTED > 0 ? "in-progress" : "waiting",
      detail: `${counts.ACCEPTED} of ${active.length} accepted · ${counts.SUBMITTED} waiting for review · ${counts.NOT_STARTED + counts.DRAFT + counts.RETURNED} not sent`,
      href: "/dr/evaluations",
    },
    {
      key: "phi-attendance",
      title: "PHI attendance report",
      description: "Review and approve the PHI monthly attendance (half days and absences of the contractor's staff).",
      state: phiApproved ? "done" : phiPending ? "in-progress" : "waiting",
      detail: phiReports.length
        ? phiReports.map((report) => `${report.phiUser.name}: ${report.status === APPROVED_PHI_STATUS ? "approved" : report.status.toLowerCase().replace(/_/g, " ")}`).join(" · ")
        : "Not received yet",
      href: "/dr/phi-attendance",
    },
    {
      key: "main-admin",
      title: "Main Administration Building report",
      description: "The Main Administration Building report sent by the PHI.",
      state: mainAdminAccepted ? "done" : mainAdmin.some((location) => location.evaluationReports[0]?.status === "SUBMITTED") ? "in-progress" : "waiting",
      detail: mainAdmin.length
        ? mainAdmin.map((location) => `${location.name}: ${location.evaluationReports[0]?.status.toLowerCase() ?? "not started"}`).join(" · ")
        : "No Main Administration location in the BOQ",
      href: "/dr/evaluations?category=ADMINISTRATION",
    },
    {
      key: "work-done",
      title: "Amount of work done",
      description: "Item-wise deductions of every location, created from the accepted evaluation reports.",
      state: allAccepted ? "done" : counts.ACCEPTED > 0 ? "in-progress" : "waiting",
      detail: allAccepted ? "All locations accepted" : `${active.length - counts.ACCEPTED} location(s) still to be accepted`,
      href: "/dr/reports/work-done",
    },
    {
      key: "attendance",
      title: "Attendance report",
      description: "Deduction for absence and half days from the approved PHI attendance.",
      state: phiApproved ? "done" : "waiting",
      detail: phiApproved ? `Deduction for absence Rs. ${formatMoney(absenceCents(phiReports), { dashForZero: false })}` : "Waiting for the approved PHI attendance",
      href: "/dr/reports/attendance",
    },
    {
      key: "final",
      title: "Cleaning & Janitorial Services report",
      description: "Approved amounts of all locations less the deduction for absence - the final payment report.",
      state: finalized ? "done" : allAccepted && phiApproved ? "in-progress" : "blocked",
      detail: finalized
        ? `Finalized${payment?.finalizedBy ? ` by ${payment.finalizedBy.name}` : ""} · payable Rs. ${formatMoney(toCents(payment?.payableTotal), { dashForZero: false })}`
        : allAccepted && phiApproved
          ? "Ready to finalize"
          : "Available after all reports are accepted and the PHI attendance is approved",
      href: "/dr/reports/final",
    },
  ];

  return { period, steps, counts, activeLocations: active.length, paymentStatus: payment?.status ?? null };
}

// ---------------------------------------------------------------------------
// Amount of work done
// ---------------------------------------------------------------------------

export async function getWorkDoneReport(db: Pick<PrismaClient, "location">, period: Partial<Period>, options: { category?: string } = {}) {
  assertPeriod(period);
  const locations = await loadLocationsWithReports(db, period, true);
  const sections = locations
    .filter((location) => location.active || location.evaluationReports.length)
    .filter((location) => !options.category || location.category === options.category)
    .map((location) => {
      const report = location.evaluationReports[0] as (typeof location.evaluationReports)[number] & { rows?: Parameters<typeof serializeRow>[0][] } | undefined;
      const rows = report?.rows?.map(serializeRow) ?? [];
      return {
        locationId: location.id,
        boqNumber: location.boqNumber,
        name: location.name,
        shortName: location.shortName,
        category: location.category,
        evaluationFormat: location.evaluationFormat,
        reportId: report?.id ?? null,
        status: report?.status ?? null,
        boqCents: report ? toCents(report.boqTotal) : locationBoqCents(location, location.boqItems),
        deductionCents: report ? toCents(report.deductionTotal) : 0,
        approvedCents: report?.status === "ACCEPTED" ? toCents(report.approvedTotal) : null,
        draftApprovedCents: report ? toCents(report.approvedTotal) : null,
        rows,
      };
    });
  const accepted = sections.filter((section) => section.status === "ACCEPTED");
  return {
    period,
    sections,
    acceptedCount: accepted.length,
    totalCount: sections.length,
    approvedCents: accepted.reduce((sum, section) => sum + (section.approvedCents ?? 0), 0),
  };
}

// ---------------------------------------------------------------------------
// Attendance report
// ---------------------------------------------------------------------------

export async function getAttendanceReport(
  db: Pick<PrismaClient, "phiMonthlyAttendanceReport" | "phiDailyAttendance">,
  actor: Actor,
  period: Partial<Period>,
) {
  assertPeriod(period);
  const [reports, daily] = await Promise.all([loadPhiMonthlyReports(db, period), listDailyAttendance(db, actor, period)]);
  const approved = reports.filter((report) => report.status === APPROVED_PHI_STATUS);

  const categories = PHI_MONTHLY_ATTENDANCE_CATEGORIES.map((category) => {
    const rows = approved.flatMap((report) => report.rows.filter((row) => row.category === category.key));
    const count = rows.reduce((sum, row) => sum + row.employeeCount, 0);
    const totalCents = rows.reduce((sum, row) => sum + toCents(row.rowTotal), 0);
    const rateCents = rows.length ? toCents(rows[0].deductionRate) : toCents(category.defaultRate);
    return { key: category.key, label: category.label, count, rateCents, totalCents };
  });

  // The daily sheet summed per date over all PHI logins.
  const byDate = new Map<string, ReturnType<typeof totalsByCategory>>();
  for (const row of daily) {
    const totals = totalsByCategory([row]);
    const current = byDate.get(row.date);
    if (current) for (const key of Object.keys(totals) as (keyof typeof totals)[]) current[key] += totals[key];
    else byDate.set(row.date, totals);
  }

  return {
    period,
    reports: reports.map((report) => ({
      id: report.id,
      status: report.status,
      phiName: report.phiUser.name,
      grandTotalCents: toCents(report.grandTotal),
      submittedAt: report.resubmittedAt ?? report.submittedAt,
      finalizedAt: report.finalizedAt,
    })),
    categories,
    absenceCents: absenceCents(reports),
    approved: approved.length > 0,
    daily: [...byDate.entries()].map(([date, totals]) => ({ date, totals })),
    dailyTotals: totalsByCategory(daily),
  };
}

// ---------------------------------------------------------------------------
// Cleaning & Janitorial Services (final payment) report
// ---------------------------------------------------------------------------

export type PaymentLine = {
  locationId: string;
  boqNumber: number | null;
  description: string;
  boqCents: number;
  invoiceCents: number;
  approvedCents: number | null;
  reportStatus: EvaluationReportStatus | null;
  evaluationReportId: string | null;
};

export async function getPaymentReport(
  db: Pick<PrismaClient, "location" | "phiMonthlyAttendanceReport" | "monthlyPaymentReport">,
  period: Partial<Period>,
) {
  assertPeriod(period);
  const stored = await db.monthlyPaymentReport.findUnique({
    where: { year_month: period },
    select: {
      id: true,
      status: true,
      remarks: true,
      finalizedAt: true,
      absenceDeduction: true,
      finalizedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
      lines: {
        orderBy: [{ sortOrder: "asc" }],
        select: { locationId: true, boqNumber: true, description: true, boqAmount: true, invoiceAmount: true, approvedAmount: true, evaluationReportId: true },
      },
    },
  });

  if (stored?.status === "FINALIZED") {
    const lines: PaymentLine[] = stored.lines.map((line) => ({
      locationId: line.locationId,
      boqNumber: line.boqNumber,
      description: line.description,
      boqCents: toCents(line.boqAmount),
      invoiceCents: toCents(line.invoiceAmount),
      approvedCents: toCents(line.approvedAmount),
      reportStatus: "ACCEPTED",
      evaluationReportId: line.evaluationReportId,
    }));
    const totals = summarizePaymentLines(
      lines.map((line) => ({ boqCents: line.boqCents, invoiceCents: line.invoiceCents, approvedCents: line.approvedCents ?? 0 })),
      toCents(stored.absenceDeduction),
    );
    return {
      period,
      status: "FINALIZED" as const,
      id: stored.id,
      remarks: stored.remarks,
      finalizedAt: stored.finalizedAt,
      finalizedBy: stored.finalizedBy?.name ?? null,
      lines,
      totals,
      blockers: [] as string[],
      phiReports: [] as { name: string; status: string }[],
    };
  }

  const [locations, phiReports] = await Promise.all([loadLocationsWithReports(db, period, false), loadPhiMonthlyReports(db, period)]);
  const invoiceOverrides = new Map((stored?.lines ?? []).map((line) => [line.locationId, toCents(line.invoiceAmount)]));

  const lines: PaymentLine[] = locations
    .filter((location) => location.active)
    .map((location) => {
      const report = location.evaluationReports[0];
      const boqCents = locationBoqCents(location, location.boqItems);
      return {
        locationId: location.id,
        boqNumber: location.boqNumber,
        description: location.boqDescription ?? location.name,
        boqCents,
        invoiceCents: invoiceOverrides.get(location.id) ?? boqCents,
        approvedCents: report?.status === "ACCEPTED" ? toCents(report.approvedTotal) : null,
        reportStatus: report?.status ?? null,
        evaluationReportId: report?.id ?? null,
      };
    });

  const blockers: string[] = [];
  const notAccepted = lines.filter((line) => line.reportStatus !== "ACCEPTED");
  if (notAccepted.length) {
    blockers.push(
      `${notAccepted.length} evaluation report${notAccepted.length === 1 ? " is" : "s are"} not accepted yet: ${notAccepted
        .slice(0, 8)
        .map((line) => (line.boqNumber ? `${line.boqNumber}. ` : "") + line.description.replace(/^Cleaning (and|&) Janitorial Services at the /i, ""))
        .join(", ")}${notAccepted.length > 8 ? ", ..." : ""}.`,
    );
  }
  if (!phiReports.some((report) => report.status === APPROVED_PHI_STATUS)) {
    blockers.push("The PHI monthly attendance report of this month has not been approved.");
  }
  const pendingPhi = phiReports.filter((report) => PENDING_PHI_STATUSES.includes(report.status));
  if (pendingPhi.length) {
    blockers.push(`PHI attendance still open: ${pendingPhi.map((report) => `${report.phiUser.name} (${report.status.toLowerCase().replace(/_/g, " ")})`).join(", ")}.`);
  }

  const totals = summarizePaymentLines(
    lines.map((line) => ({ boqCents: line.boqCents, invoiceCents: line.invoiceCents, approvedCents: line.approvedCents ?? 0 })),
    absenceCents(phiReports),
  );

  return {
    period,
    status: "DRAFT" as const,
    id: stored?.id ?? null,
    remarks: stored?.remarks ?? null,
    finalizedAt: null,
    finalizedBy: null,
    lines,
    totals,
    blockers,
    phiReports: phiReports.map((report) => ({ name: report.phiUser.name, status: report.status })),
  };
}

export type PaymentReportView = Awaited<ReturnType<typeof getPaymentReport>>;

type PaymentDb = Pick<PrismaClient, "$transaction" | "location" | "phiMonthlyAttendanceReport" | "monthlyPaymentReport" | "monthlyPaymentReportLine" | "activityLog" | "notification" | "user">;

/** Saves the invoice amounts / remarks of a draft payment report. */
export async function savePaymentDraft(
  db: PaymentDb,
  actor: Actor,
  period: Partial<Period>,
  input: { invoices?: Record<string, unknown>; remarks?: unknown },
) {
  assertDeputyRegistrar(actor);
  assertPeriod(period);
  const view = await getPaymentReport(db, period);
  if (view.status === "FINALIZED") throw new MonthlyProcessError("FINALIZED", "This report is finalized. Reopen it to make changes.", 409);

  const invoices = new Map<string, number>();
  for (const [locationId, value] of Object.entries(input.invoices ?? {})) {
    const cents = toCents(value);
    if (!Number.isFinite(cents) || cents < 0) throw new MonthlyProcessError("INVALID_VALUE", "Invoice amounts must be 0 or more.");
    invoices.set(locationId, cents);
  }
  const remarks = typeof input.remarks === "string" ? input.remarks.trim().slice(0, 2000) || null : undefined;

  await db.$transaction(async (tx) => {
    const report = await tx.monthlyPaymentReport.upsert({
      where: { year_month: period },
      create: { year: period.year, month: period.month, createdById: actor.id, ...(remarks !== undefined ? { remarks } : {}) },
      update: remarks !== undefined ? { remarks } : {},
      select: { id: true },
    });
    for (const [index, line] of view.lines.entries()) {
      const invoiceCents = invoices.get(line.locationId) ?? line.invoiceCents;
      await tx.monthlyPaymentReportLine.upsert({
        where: { reportId_locationId: { reportId: report.id, locationId: line.locationId } },
        create: {
          reportId: report.id,
          locationId: line.locationId,
          boqNumber: line.boqNumber,
          description: line.description,
          sortOrder: index,
          boqAmount: centsToDecimalString(line.boqCents),
          invoiceAmount: centsToDecimalString(invoiceCents),
          approvedAmount: centsToDecimalString(line.approvedCents ?? 0),
          evaluationReportId: line.evaluationReportId,
        },
        update: { invoiceAmount: centsToDecimalString(invoiceCents), sortOrder: index, description: line.description, boqNumber: line.boqNumber },
      });
    }
    await tx.activityLog.create({
      data: { userId: actor.id, action: "PAYMENT_REPORT_UPDATED", entityType: "MonthlyPaymentReport", entityId: report.id, description: `Updated the ${periodLabel(period)} Cleaning & Janitorial Services report.` },
    });
  });

  return getPaymentReport(db, period);
}

export async function finalizePaymentReport(db: PaymentDb, actor: Actor, period: Partial<Period>) {
  assertDeputyRegistrar(actor);
  assertPeriod(period);
  const emails: EmailMessage[] = [];

  await db.$transaction(
    async (tx) => {
      // Recalculate inside the transaction so the snapshot matches what was checked.
      const view = await getPaymentReport(tx, period);
      if (view.status === "FINALIZED") throw new MonthlyProcessError("FINALIZED", "This report is already finalized.", 409);
      if (view.blockers.length) throw new MonthlyProcessError("NOT_READY", view.blockers.join(" "), 409);

      const now = new Date();
      const report = await tx.monthlyPaymentReport.upsert({
        where: { year_month: period },
        create: { year: period.year, month: period.month, createdById: actor.id },
        update: {},
        select: { id: true },
      });
      await tx.monthlyPaymentReportLine.deleteMany({ where: { reportId: report.id } });
      await tx.monthlyPaymentReportLine.createMany({
        data: view.lines.map((line, index) => ({
          reportId: report.id,
          locationId: line.locationId,
          boqNumber: line.boqNumber,
          description: line.description,
          sortOrder: index,
          boqAmount: centsToDecimalString(line.boqCents),
          invoiceAmount: centsToDecimalString(line.invoiceCents),
          approvedAmount: centsToDecimalString(line.approvedCents ?? 0),
          evaluationReportId: line.evaluationReportId,
        })),
      });
      const changed = await tx.monthlyPaymentReport.updateMany({
        where: { id: report.id, status: "DRAFT" },
        data: {
          status: "FINALIZED",
          boqTotal: centsToDecimalString(view.totals.boqCents),
          invoiceTotal: centsToDecimalString(view.totals.invoiceCents),
          approvedTotal: centsToDecimalString(view.totals.approvedCents),
          absenceDeduction: centsToDecimalString(view.totals.absenceDeductionCents),
          payableTotal: centsToDecimalString(view.totals.payableCents),
          finalizedAt: now,
          finalizedById: actor.id,
        },
      });
      if (changed.count !== 1) throw new MonthlyProcessError("FINALIZED", "This report has just been finalized by someone else.", 409);

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "PAYMENT_REPORT_FINALIZED",
          entityType: "MonthlyPaymentReport",
          entityId: report.id,
          description: `Finalized the ${periodLabel(period)} Cleaning & Janitorial Services report.`,
          metadata: {
            approvedTotal: centsToDecimalString(view.totals.approvedCents),
            absenceDeduction: centsToDecimalString(view.totals.absenceDeductionCents),
            payableTotal: centsToDecimalString(view.totals.payableCents),
          } as Prisma.InputJsonValue,
        },
      });

      const recipients = await activeUsersWithRole(tx, "DEPUTY_REGISTRAR");
      emails.push(
        ...(await notifyUsers(tx, recipients, {
          event: "PAYMENT_REPORT_FINALIZED",
          title: `Cleaning & Janitorial Services - ${periodLabel(period)} finalized`,
          message: `${actor.name} finalized the Cleaning & Janitorial Services report for ${periodLabel(period)}.\nApproved amount Rs. ${formatMoney(view.totals.approvedCents, { dashForZero: false })}, less deduction for absence Rs. ${formatMoney(view.totals.absenceDeductionCents, { dashForZero: false })}, payable Rs. ${formatMoney(view.totals.payableCents, { dashForZero: false })}.`,
          entityType: "MonthlyPaymentReport",
          entityId: report.id,
          link: `/dr/reports/final?period=${period.year}-${String(period.month).padStart(2, "0")}`,
          dedupeKey: `payment-finalized:${report.id}:${now.getTime()}`,
        })),
      );
    },
    { timeout: 60_000, maxWait: 20_000 },
  );

  return { report: await getPaymentReport(db, period), emails };
}

export async function reopenPaymentReport(db: PaymentDb, actor: Actor, period: Partial<Period>, reasonInput: unknown) {
  assertDeputyRegistrar(actor);
  assertPeriod(period);
  const reason = typeof reasonInput === "string" ? reasonInput.trim().slice(0, 1000) : "";
  if (!reason) throw new MonthlyProcessError("REASON_REQUIRED", "Write why the report is being reopened.");

  await db.$transaction(async (tx) => {
    const report = await tx.monthlyPaymentReport.findUnique({ where: { year_month: period }, select: { id: true, status: true } });
    if (!report || report.status !== "FINALIZED") throw new MonthlyProcessError("NOT_FINALIZED", "This report is not finalized.", 409);
    await tx.monthlyPaymentReport.update({ where: { id: report.id }, data: { status: "DRAFT", finalizedAt: null, finalizedById: null } });
    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "PAYMENT_REPORT_REOPENED",
        entityType: "MonthlyPaymentReport",
        entityId: report.id,
        description: `Reopened the ${periodLabel(period)} Cleaning & Janitorial Services report.`,
        metadata: { reason } as Prisma.InputJsonValue,
      },
    });
  });

  return getPaymentReport(db, period);
}
