import type { BoqFrequency, EvaluationReportStatus, Prisma, PrismaClient } from "@/app/generated/prisma/client";
import type { EmailMessage } from "@/lib/email";
import {
  calculateRateRow,
  calculateScheduledRow,
  centsToDecimalString,
  formatMoney,
  occurrencesFor,
  rowState,
  toCents,
  type BoqFrequencyKey,
} from "@/lib/evaluation-calc";
import { activeUsersWithRole, notifyUsers } from "@/lib/notifications";
import { comparePeriods, currentPeriod, isValidPeriod, periodLabel, type Period } from "@/lib/periods";
import {
  accessibleLocationIds,
  assertDeputyRegistrar,
  assertLocationAccess,
  canAccessLocation,
  isDeputyRegistrar,
  locationReporters,
  type Actor,
} from "@/lib/reporting-assignments";

export class EvaluationReportError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "EvaluationReportError";
    this.code = code;
    this.status = status;
  }
}

export const EDITABLE_STATUSES: readonly EvaluationReportStatus[] = ["DRAFT", "RETURNED"];

export const reportStatusLabels: Record<EvaluationReportStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Sent to DR",
  RETURNED: "Returned for correction",
  ACCEPTED: "Accepted by DR",
};

function assertValidPeriod(period: Partial<Period>): asserts period is Period {
  if (!isValidPeriod(period)) {
    throw new EvaluationReportError("INVALID_PERIOD", "Select a valid month.");
  }
  if (comparePeriods(period, currentPeriod()) > 0) {
    throw new EvaluationReportError("FUTURE_PERIOD", "Reports cannot be prepared for a future month.");
  }
}

type Db = Pick<
  PrismaClient,
  "$transaction" | "location" | "boqItem" | "evaluationReport" | "evaluationReportRow" | "reportingAssignment" | "user" | "notification" | "activityLog" | "monthlyPaymentReport"
>;
type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

// ---------------------------------------------------------------------------
// BOQ amount of a location
// ---------------------------------------------------------------------------

/**
 * Monthly BOQ amount of a location: the fixed amount when one is set (rate
 * based services, or a location whose item amounts are still being entered),
 * otherwise the sum of its active BOQ items.
 */
export function locationBoqCents(location: { boqAmount: unknown }, items: readonly { monthlyAmount: unknown }[]) {
  if (location.boqAmount !== null && location.boqAmount !== undefined) return toCents(location.boqAmount);
  return items.reduce((sum, item) => sum + toCents(item.monthlyAmount), 0);
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listReportsForPeriod(
  db: Pick<PrismaClient, "location" | "reportingAssignment">,
  actor: Actor,
  period: Period,
  filters: { category?: string } = {},
) {
  const ids = await accessibleLocationIds(db, actor);
  const locations = await db.location.findMany({
    where: {
      active: true,
      ...(ids ? { id: { in: ids } } : {}),
      ...(filters.category ? { category: filters.category as Prisma.EnumLocationCategoryFilter["equals"] } : {}),
    },
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
      boqItems: { where: { active: true }, select: { monthlyAmount: true } },
      reportingAssignments: { where: { active: true, user: { active: true } }, select: { user: { select: { id: true, name: true, role: true } } } },
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
          returnReason: true,
          updatedAt: true,
          submittedBy: { select: { name: true } },
          _count: { select: { rows: true } },
          rows: { where: { filled: true }, select: { id: true } },
        },
      },
    },
  });

  return locations.map((location) => {
    const report = location.evaluationReports[0] ?? null;
    return {
      id: location.id,
      code: location.code,
      name: location.name,
      shortName: location.shortName,
      boqNumber: location.boqNumber,
      category: location.category,
      evaluationFormat: location.evaluationFormat,
      itemCount: location.boqItems.length,
      boqCents: locationBoqCents(location, location.boqItems),
      reporters: location.reportingAssignments.map((assignment) => assignment.user),
      report: report
        ? {
            id: report.id,
            status: report.status,
            boqCents: toCents(report.boqTotal),
            deductionCents: toCents(report.deductionTotal),
            approvedCents: toCents(report.approvedTotal),
            submittedAt: report.submittedAt,
            reviewedAt: report.reviewedAt,
            returnReason: report.returnReason,
            updatedAt: report.updatedAt,
            submittedBy: report.submittedBy?.name ?? null,
            rowCount: report._count.rows,
            filledCount: report.rows.length,
          }
        : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Starting a report
// ---------------------------------------------------------------------------

type BoqItemForRow = {
  id: string;
  itemNo: string;
  subItem: string;
  description: string;
  frequency: BoqFrequency;
  monthlyAmount: Prisma.Decimal | string | number;
  unitRate: Prisma.Decimal | string | number | null;
  unitLabel: string | null;
  penaltyRate: Prisma.Decimal | string | number | null;
  sortOrder: number;
};

function blankRowData(item: BoqItemForRow, period: Period, rateBased: boolean) {
  const amountCents = toCents(item.monthlyAmount);
  return {
    boqItemId: item.id,
    itemNo: item.itemNo,
    subItem: item.subItem,
    description: item.description,
    frequency: item.frequency,
    sortOrder: item.sortOrder,
    monthlyAmount: centsToDecimalString(amountCents),
    unitRate: item.unitRate === null ? null : centsToDecimalString(toCents(item.unitRate)),
    unitLabel: item.unitLabel,
    penaltyRate: item.penaltyRate === null ? null : centsToDecimalString(toCents(item.penaltyRate)),
    scheduledCount: rateBased ? 0 : occurrencesFor(item.frequency as BoqFrequencyKey, period).length,
    completedCount: 0,
    completedKeys: [] as string[],
    quantity: null,
    penaltyQuantity: null,
    filled: false,
    deductionPercent: null,
    deductionAmount: "0.00",
    // Until a scheduled row is evaluated it carries its full BOQ amount.
    totalAmount: rateBased ? "0.00" : centsToDecimalString(amountCents),
  };
}

const boqItemSelect = {
  id: true,
  itemNo: true,
  subItem: true,
  description: true,
  frequency: true,
  monthlyAmount: true,
  unitRate: true,
  unitLabel: true,
  penaltyRate: true,
  sortOrder: true,
} as const;

/** Opens the report of a location for a month, creating it from the BOQ the first time. */
export async function startEvaluationReport(db: Db, actor: Actor, locationId: string, period: Partial<Period>) {
  assertValidPeriod(period);
  await assertLocationAccess(db, actor, locationId);

  const existing = await db.evaluationReport.findUnique({
    where: { locationId_year_month: { locationId, year: period.year, month: period.month } },
    select: { id: true },
  });
  if (existing) return existing;

  const location = await db.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      active: true,
      evaluationFormat: true,
      boqAmount: true,
      boqItems: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: boqItemSelect },
    },
  });
  if (!location || !location.active) {
    throw new EvaluationReportError("LOCATION_NOT_FOUND", "Location not found.", 404);
  }
  if (!location.boqItems.length) {
    throw new EvaluationReportError("NO_BOQ_ITEMS", `${location.name} has no BOQ items yet. The Deputy Registrar must add them first.`, 409);
  }

  const rateBased = location.evaluationFormat === "RATE_BASED";
  const rows = location.boqItems.map((item) => blankRowData(item, period, rateBased));
  const boqCents = locationBoqCents(location, location.boqItems);
  const approvedCents = rateBased ? 0 : rows.reduce((sum, row) => sum + toCents(row.totalAmount), 0);

  try {
    return await db.$transaction(async (tx) => {
      const report = await tx.evaluationReport.create({
        data: {
          locationId,
          year: period.year,
          month: period.month,
          createdById: actor.id,
          boqTotal: centsToDecimalString(boqCents),
          deductionTotal: "0.00",
          approvedTotal: centsToDecimalString(approvedCents),
          rows: { create: rows },
        },
        select: { id: true },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "EVALUATION_REPORT_STARTED",
          entityType: "EvaluationReport",
          entityId: report.id,
          description: `Started the ${periodLabel(period)} evaluation report for ${location.name}.`,
          metadata: { locationId, year: period.year, month: period.month } as Prisma.InputJsonValue,
        },
      });
      return report;
    });
  } catch (error) {
    // Two people opened the report at the same time: use the one that won.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      const report = await db.evaluationReport.findUnique({
        where: { locationId_year_month: { locationId, year: period.year, month: period.month } },
        select: { id: true },
      });
      if (report) return report;
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Reading a report
// ---------------------------------------------------------------------------

const reportDetailSelect = {
  id: true,
  locationId: true,
  year: true,
  month: true,
  status: true,
  boqTotal: true,
  deductionTotal: true,
  approvedTotal: true,
  submittedAt: true,
  reviewedAt: true,
  returnReason: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { name: true } },
  submittedBy: { select: { name: true } },
  reviewedBy: { select: { name: true } },
  location: {
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
      boqItems: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { ...boqItemSelect, details: true, plannedPerYear: true } },
    },
  },
  rows: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
} satisfies Prisma.EvaluationReportSelect;

type ReportRecord = Prisma.EvaluationReportGetPayload<{ select: typeof reportDetailSelect }>;
type RowRecord = ReportRecord["rows"][number];

function keysOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
}

export function serializeRow(row: RowRecord) {
  const deductionCents = toCents(row.deductionAmount);
  return {
    id: row.id,
    boqItemId: row.boqItemId,
    itemNo: row.itemNo,
    subItem: row.subItem,
    description: row.description,
    frequency: row.frequency as BoqFrequencyKey,
    amountCents: toCents(row.monthlyAmount),
    unitRateCents: row.unitRate === null ? null : toCents(row.unitRate),
    unitLabel: row.unitLabel,
    penaltyRateCents: row.penaltyRate === null ? null : toCents(row.penaltyRate),
    scheduledCount: row.scheduledCount,
    completedCount: row.completedCount,
    completedKeys: keysOf(row.completedKeys),
    quantity: row.quantity,
    penaltyQuantity: row.penaltyQuantity,
    filled: row.filled,
    deductionPercent: row.deductionPercent === null ? null : Number(row.deductionPercent),
    deductionCents,
    totalCents: toCents(row.totalAmount),
    remark: row.remark,
    state: rowState({ filled: row.filled, deductionCents, penaltyQuantity: row.penaltyQuantity }),
  };
}

export type SerializedRow = ReturnType<typeof serializeRow>;

/** True when the BOQ has changed since an editable report was started. */
function boqDiffers(report: ReportRecord) {
  const items = report.location.boqItems;
  const linked = report.rows.filter((row) => row.boqItemId);
  if (linked.length !== report.rows.length || items.length !== report.rows.length) return true;
  const byItem = new Map(report.rows.map((row) => [row.boqItemId, row]));
  return items.some((item) => {
    const row = byItem.get(item.id);
    return (
      !row ||
      row.description !== item.description ||
      row.itemNo !== item.itemNo ||
      row.subItem !== item.subItem ||
      row.frequency !== item.frequency ||
      toCents(row.monthlyAmount) !== toCents(item.monthlyAmount) ||
      (row.unitRate === null ? null : toCents(row.unitRate)) !== (item.unitRate === null ? null : toCents(item.unitRate)) ||
      (row.penaltyRate === null ? null : toCents(row.penaltyRate)) !== (item.penaltyRate === null ? null : toCents(item.penaltyRate))
    );
  });
}

export async function getEvaluationReport(db: Pick<PrismaClient, "evaluationReport" | "reportingAssignment" | "monthlyPaymentReport">, actor: Actor, reportId: string) {
  const report = await db.evaluationReport.findUnique({ where: { id: reportId }, select: reportDetailSelect });
  if (!report) return null;
  if (!(await canAccessLocation(db, actor, report.locationId))) {
    throw new EvaluationReportError("ACCESS_DENIED", "This report belongs to a location that is not assigned to your login.", 403);
  }

  const paymentReport = await db.monthlyPaymentReport.findUnique({
    where: { year_month: { year: report.year, month: report.month } },
    select: { status: true },
  });

  const rows = report.rows.map(serializeRow);
  const editable = EDITABLE_STATUSES.includes(report.status);
  const plannedByItem = new Map(report.location.boqItems.map((item) => [item.id, { plannedPerYear: item.plannedPerYear, details: item.details }]));

  return {
    id: report.id,
    period: { year: report.year, month: report.month },
    status: report.status,
    boqCents: toCents(report.boqTotal),
    deductionCents: toCents(report.deductionTotal),
    approvedCents: toCents(report.approvedTotal),
    submittedAt: report.submittedAt,
    reviewedAt: report.reviewedAt,
    returnReason: report.returnReason,
    remarks: report.remarks,
    updatedAt: report.updatedAt,
    createdBy: report.createdBy.name,
    submittedBy: report.submittedBy?.name ?? null,
    reviewedBy: report.reviewedBy?.name ?? null,
    location: {
      id: report.location.id,
      code: report.location.code,
      name: report.location.name,
      shortName: report.location.shortName,
      boqNumber: report.location.boqNumber,
      boqDescription: report.location.boqDescription,
      category: report.location.category,
      evaluationFormat: report.location.evaluationFormat,
    },
    rows: rows.map((row) => ({ ...row, ...(row.boqItemId ? plannedByItem.get(row.boqItemId) : {}) })),
    filledCount: rows.filter((row) => row.filled).length,
    editable,
    canEdit: editable,
    canReview: isDeputyRegistrar(actor) && report.status === "SUBMITTED",
    canReopen: isDeputyRegistrar(actor) && report.status === "ACCEPTED" && paymentReport?.status !== "FINALIZED",
    paymentFinalized: paymentReport?.status === "FINALIZED",
    boqChanged: editable && boqDiffers(report),
  };
}

export type EvaluationReportView = NonNullable<Awaited<ReturnType<typeof getEvaluationReport>>>;

// ---------------------------------------------------------------------------
// Editing rows
// ---------------------------------------------------------------------------

async function loadEditableReport(tx: Tx, actor: Actor, reportId: string) {
  const report = await tx.evaluationReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, locationId: true, year: true, month: true, location: { select: { name: true, evaluationFormat: true, boqAmount: true } } },
  });
  if (!report) throw new EvaluationReportError("NOT_FOUND", "Report not found.", 404);
  await assertLocationAccess(tx, actor, report.locationId);
  if (!EDITABLE_STATUSES.includes(report.status)) {
    throw new EvaluationReportError(
      "REPORT_LOCKED",
      report.status === "SUBMITTED"
        ? "This report has been sent to the Deputy Registrar. It can be edited again only if it is returned."
        : "This report has been accepted by the Deputy Registrar and can no longer be edited.",
      409,
    );
  }
  return report;
}

/** Recalculates and stores the report totals from its rows. */
async function recalculateTotals(tx: Tx, reportId: string, boqCents?: number) {
  const rows = await tx.evaluationReportRow.findMany({ where: { reportId }, select: { deductionAmount: true, totalAmount: true } });
  const deductionCents = rows.reduce((sum, row) => sum + toCents(row.deductionAmount), 0);
  const approvedCents = rows.reduce((sum, row) => sum + toCents(row.totalAmount), 0);
  return tx.evaluationReport.update({
    where: { id: reportId },
    data: {
      deductionTotal: centsToDecimalString(deductionCents),
      approvedTotal: centsToDecimalString(approvedCents),
      ...(boqCents === undefined ? {} : { boqTotal: centsToDecimalString(boqCents) }),
    },
    select: { boqTotal: true, deductionTotal: true, approvedTotal: true },
  });
}

function parseCount(value: unknown, name: string) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) {
    throw new EvaluationReportError("INVALID_VALUE", `${name} must be a whole number of 0 or more.`);
  }
  return parsed;
}

export type RowUpdateInput = {
  /** SCHEDULED rows: keys of the occurrences that were done. */
  completedKeys?: unknown;
  /** RATE_BASED rows. */
  quantity?: unknown;
  penaltyQuantity?: unknown;
  remark?: unknown;
  /** Clears the row back to blank. */
  reset?: unknown;
};

export async function updateEvaluationRow(db: Db, actor: Actor, reportId: string, rowId: string, input: RowUpdateInput) {
  const remark = typeof input.remark === "string" ? input.remark.trim().slice(0, 500) || null : undefined;

  return db.$transaction(async (tx) => {
    const report = await loadEditableReport(tx, actor, reportId);
    const row = await tx.evaluationReportRow.findFirst({
      where: { id: rowId, reportId },
      select: { id: true, frequency: true, monthlyAmount: true, unitRate: true, penaltyRate: true, unitLabel: true, itemNo: true, subItem: true },
    });
    if (!row) throw new EvaluationReportError("ROW_NOT_FOUND", "Row not found.", 404);

    const rateBased = report.location.evaluationFormat === "RATE_BASED";
    const period = { year: report.year, month: report.month };
    let data: Prisma.EvaluationReportRowUpdateInput;

    if (input.reset === true) {
      data = rateBased
        ? { filled: false, quantity: null, penaltyQuantity: null, deductionAmount: "0.00", totalAmount: "0.00", deductionPercent: null }
        : {
            filled: false,
            completedKeys: [],
            completedCount: 0,
            deductionPercent: null,
            deductionAmount: "0.00",
            totalAmount: centsToDecimalString(toCents(row.monthlyAmount)),
          };
    } else if (rateBased) {
      const quantity = parseCount(input.quantity, "Quantity");
      const penaltyQuantity = parseCount(input.penaltyQuantity, "Number not removed");
      const unitRateCents = row.unitRate === null ? null : toCents(row.unitRate);
      const penaltyRateCents = row.penaltyRate === null ? null : toCents(row.penaltyRate);
      if (quantity > 0 && unitRateCents === null) {
        throw new EvaluationReportError(
          "RATE_NOT_SET",
          "The rate for this item has not been entered in the BOQ yet. Ask the Deputy Registrar to set it.",
          409,
        );
      }
      if (penaltyQuantity > 0 && penaltyRateCents === null) {
        throw new EvaluationReportError("NO_PENALTY", "This item has no fine in the BOQ.");
      }
      const result = calculateRateRow(unitRateCents, quantity, penaltyRateCents, penaltyQuantity);
      data = {
        filled: true,
        quantity,
        penaltyQuantity,
        deductionAmount: centsToDecimalString(result.penaltyCents),
        totalAmount: centsToDecimalString(result.totalCents),
        deductionPercent: null,
      };
    } else {
      if (!Array.isArray(input.completedKeys)) {
        throw new EvaluationReportError("INVALID_VALUE", "Tick the work that was done.");
      }
      const result = calculateScheduledRow(
        toCents(row.monthlyAmount),
        row.frequency as BoqFrequencyKey,
        period,
        keysOf(input.completedKeys),
      );
      data = {
        filled: true,
        scheduledCount: result.scheduledCount,
        completedCount: result.completedCount,
        completedKeys: result.completedKeys,
        deductionPercent: result.deductionPercent.toFixed(2),
        deductionAmount: centsToDecimalString(result.deductionCents),
        totalAmount: centsToDecimalString(result.totalCents),
      };
    }

    if (remark !== undefined) data.remark = remark;

    const updated = await tx.evaluationReportRow.update({
      where: { id: row.id },
      data,
      select: reportDetailSelect.rows.select,
    });
    const totals = await recalculateTotals(tx, reportId);
    const filledCount = await tx.evaluationReportRow.count({ where: { reportId, filled: true } });

    return {
      row: serializeRow(updated),
      boqCents: toCents(totals.boqTotal),
      deductionCents: toCents(totals.deductionTotal),
      approvedCents: toCents(totals.approvedTotal),
      filledCount,
    };
  });
}

/** Brings an editable report in line with the current BOQ (amounts, rates and items). */
export async function syncEvaluationReportWithBoq(db: Db, actor: Actor, reportId: string) {
  return db.$transaction(async (tx) => {
    const report = await loadEditableReport(tx, actor, reportId);
    const period = { year: report.year, month: report.month };
    const rateBased = report.location.evaluationFormat === "RATE_BASED";
    const [items, rows] = await Promise.all([
      tx.boqItem.findMany({ where: { locationId: report.locationId, active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: boqItemSelect }),
      tx.evaluationReportRow.findMany({ where: { reportId }, select: reportDetailSelect.rows.select }),
    ]);
    if (!items.length) {
      throw new EvaluationReportError("NO_BOQ_ITEMS", "The BOQ of this location has no active items.", 409);
    }

    const itemIds = new Set(items.map((item) => item.id));
    const obsolete = rows.filter((row) => !row.boqItemId || !itemIds.has(row.boqItemId)).map((row) => row.id);
    if (obsolete.length) await tx.evaluationReportRow.deleteMany({ where: { id: { in: obsolete } } });

    const rowByItem = new Map(rows.filter((row) => row.boqItemId).map((row) => [row.boqItemId as string, row]));
    for (const item of items) {
      const row = rowByItem.get(item.id);
      if (!row) {
        await tx.evaluationReportRow.create({ data: { reportId, ...blankRowData(item, period, rateBased) } });
        continue;
      }

      const blank = blankRowData(item, period, rateBased);
      const frequencyChanged = row.frequency !== item.frequency;
      const base = {
        itemNo: item.itemNo,
        subItem: item.subItem,
        description: item.description,
        frequency: item.frequency,
        sortOrder: item.sortOrder,
        monthlyAmount: blank.monthlyAmount,
        unitRate: blank.unitRate,
        unitLabel: blank.unitLabel,
        penaltyRate: blank.penaltyRate,
      };

      if (!row.filled || frequencyChanged) {
        // A changed frequency changes what can be ticked, so the row is cleared.
        const { boqItemId: _ignored, ...rest } = blank;
        void _ignored;
        await tx.evaluationReportRow.update({ where: { id: row.id }, data: { ...rest, remark: row.remark } });
      } else if (rateBased) {
        const result = calculateRateRow(
          blank.unitRate === null ? null : toCents(blank.unitRate),
          row.quantity ?? 0,
          blank.penaltyRate === null ? null : toCents(blank.penaltyRate),
          row.penaltyQuantity ?? 0,
        );
        await tx.evaluationReportRow.update({
          where: { id: row.id },
          data: { ...base, deductionAmount: centsToDecimalString(result.penaltyCents), totalAmount: centsToDecimalString(result.totalCents) },
        });
      } else {
        const result = calculateScheduledRow(toCents(blank.monthlyAmount), item.frequency as BoqFrequencyKey, period, keysOf(row.completedKeys));
        await tx.evaluationReportRow.update({
          where: { id: row.id },
          data: {
            ...base,
            scheduledCount: result.scheduledCount,
            completedCount: result.completedCount,
            completedKeys: result.completedKeys,
            deductionPercent: result.deductionPercent.toFixed(2),
            deductionAmount: centsToDecimalString(result.deductionCents),
            totalAmount: centsToDecimalString(result.totalCents),
          },
        });
      }
    }

    await recalculateTotals(tx, reportId, locationBoqCents(report.location, items));
    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "EVALUATION_REPORT_UPDATED",
        entityType: "EvaluationReport",
        entityId: reportId,
        description: `Updated the ${periodLabel(period)} report of ${report.location.name} from the BOQ.`,
      },
    });
    return { id: reportId };
  });
}

// ---------------------------------------------------------------------------
// Workflow: submit -> accept / return -> reopen
// ---------------------------------------------------------------------------

export async function submitEvaluationReport(db: Db, actor: Actor, reportId: string, remarksInput?: unknown) {
  const remarks = typeof remarksInput === "string" ? remarksInput.trim().slice(0, 1000) || null : undefined;
  const emails: EmailMessage[] = [];

  const result = await db.$transaction(async (tx) => {
    const report = await loadEditableReport(tx, actor, reportId);
    const rows = await tx.evaluationReportRow.findMany({
      where: { reportId },
      select: { filled: true, itemNo: true, subItem: true, quantity: true, unitRate: true },
    });
    const blank = rows.filter((row) => !row.filled);
    if (blank.length) {
      const names = blank.slice(0, 6).map((row) => `${row.itemNo}${row.subItem ? ` ${row.subItem}` : ""}`.trim() || "-");
      throw new EvaluationReportError(
        "ROWS_NOT_FILLED",
        `Fill in every row before sending the report. ${blank.length} row${blank.length === 1 ? " is" : "s are"} still blank (${names.join(", ")}${blank.length > 6 ? ", ..." : ""}).`,
        409,
      );
    }

    const now = new Date();
    const changed = await tx.evaluationReport.updateMany({
      where: { id: reportId, status: { in: [...EDITABLE_STATUSES] } },
      data: { status: "SUBMITTED", submittedAt: now, submittedById: actor.id, ...(remarks !== undefined ? { remarks } : {}) },
    });
    if (changed.count !== 1) throw new EvaluationReportError("ALREADY_SUBMITTED", "This report has already been sent.", 409);

    const totals = await tx.evaluationReport.findUniqueOrThrow({ where: { id: reportId }, select: { boqTotal: true, approvedTotal: true } });
    const period = { year: report.year, month: report.month };

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "EVALUATION_REPORT_SUBMITTED",
        entityType: "EvaluationReport",
        entityId: reportId,
        description: `Sent the ${periodLabel(period)} evaluation report of ${report.location.name} to the Deputy Registrar.`,
        metadata: { approvedTotal: totals.approvedTotal.toString(), resubmitted: report.status === "RETURNED" } as Prisma.InputJsonValue,
      },
    });

    const reviewers = (await activeUsersWithRole(tx, "DEPUTY_REGISTRAR")).filter((reviewer) => reviewer.id !== actor.id);
    emails.push(
      ...(await notifyUsers(tx, reviewers, {
        event: "EVALUATION_REPORT_SUBMITTED",
        title: `${report.status === "RETURNED" ? "Corrected evaluation report" : "Evaluation report"}: ${report.location.name} - ${periodLabel(period)}`,
        message: `${actor.name} sent the evaluation cleaning report for ${report.location.name} (${periodLabel(period)}). Amount as per BOQ Rs. ${formatMoney(toCents(totals.boqTotal), { dashForZero: false })}, approved amount Rs. ${formatMoney(toCents(totals.approvedTotal), { dashForZero: false })}.`,
        entityType: "EvaluationReport",
        entityId: reportId,
        link: `/evaluations/${reportId}`,
        dedupeKey: `evaluation-submitted:${reportId}:${now.getTime()}`,
      })),
    );

    return { id: reportId, status: "SUBMITTED" as const };
  });

  return { ...result, emails };
}

export async function reviewEvaluationReport(
  db: Db,
  actor: Actor,
  reportId: string,
  decision: "ACCEPT" | "RETURN",
  reasonInput?: unknown,
) {
  assertDeputyRegistrar(actor);
  const reason = typeof reasonInput === "string" ? reasonInput.trim().slice(0, 1000) : "";
  if (decision === "RETURN" && !reason) {
    throw new EvaluationReportError("REASON_REQUIRED", "Write what has to be corrected before returning the report.");
  }
  const emails: EmailMessage[] = [];

  const result = await db.$transaction(async (tx) => {
    const report = await tx.evaluationReport.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, year: true, month: true, locationId: true, approvedTotal: true, submittedBy: { select: { id: true, name: true, email: true } }, location: { select: { name: true } } },
    });
    if (!report) throw new EvaluationReportError("NOT_FOUND", "Report not found.", 404);

    const allowedFrom: EvaluationReportStatus[] = decision === "ACCEPT" ? ["SUBMITTED"] : ["SUBMITTED", "ACCEPTED"];
    if (!allowedFrom.includes(report.status)) {
      throw new EvaluationReportError(
        "NOT_REVIEWABLE",
        decision === "ACCEPT" ? "Only reports that have been sent to the DR can be accepted." : "This report cannot be returned in its current state.",
        409,
      );
    }

    const period = { year: report.year, month: report.month };
    if (report.status === "ACCEPTED") {
      const payment = await tx.monthlyPaymentReport.findUnique({ where: { year_month: period }, select: { status: true } });
      if (payment?.status === "FINALIZED") {
        throw new EvaluationReportError(
          "PAYMENT_FINALIZED",
          `The Cleaning & Janitorial Services report for ${periodLabel(period)} is finalized. Reopen it before reopening this report.`,
          409,
        );
      }
    }

    const now = new Date();
    const nextStatus: EvaluationReportStatus = decision === "ACCEPT" ? "ACCEPTED" : "RETURNED";
    const changed = await tx.evaluationReport.updateMany({
      where: { id: reportId, status: report.status },
      data: { status: nextStatus, reviewedAt: now, reviewedById: actor.id, returnReason: decision === "RETURN" ? reason : null },
    });
    if (changed.count !== 1) throw new EvaluationReportError("ALREADY_REVIEWED", "This report has just been updated by someone else.", 409);

    const reopened = report.status === "ACCEPTED";
    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: decision === "ACCEPT" ? "EVALUATION_REPORT_ACCEPTED" : reopened ? "EVALUATION_REPORT_REOPENED" : "EVALUATION_REPORT_RETURNED",
        entityType: "EvaluationReport",
        entityId: reportId,
        description: `${decision === "ACCEPT" ? "Accepted" : reopened ? "Reopened" : "Returned"} the ${periodLabel(period)} evaluation report of ${report.location.name}.`,
        metadata: { reason: reason || null, previousStatus: report.status } as Prisma.InputJsonValue,
      },
    });

    const recipients = [...(await locationReporters(tx, report.locationId)), ...(report.submittedBy ? [report.submittedBy] : [])].filter(
      (recipient) => recipient.id !== actor.id,
    );
    emails.push(
      ...(await notifyUsers(tx, recipients, {
        event: decision === "ACCEPT" ? "EVALUATION_REPORT_ACCEPTED" : "EVALUATION_REPORT_RETURNED",
        title: `${decision === "ACCEPT" ? "Accepted" : "Returned for correction"}: ${report.location.name} - ${periodLabel(period)}`,
        message:
          decision === "ACCEPT"
            ? `The Deputy Registrar accepted the evaluation cleaning report for ${report.location.name} (${periodLabel(period)}). Approved amount Rs. ${formatMoney(toCents(report.approvedTotal), { dashForZero: false })}.`
            : `The Deputy Registrar returned the evaluation cleaning report for ${report.location.name} (${periodLabel(period)}) for correction.\nReason: ${reason}`,
        entityType: "EvaluationReport",
        entityId: reportId,
        link: `/evaluations/${reportId}`,
        dedupeKey: `evaluation-${decision.toLowerCase()}:${reportId}:${now.getTime()}`,
      })),
    );

    return { id: reportId, status: nextStatus };
  });

  return { ...result, emails };
}

/** DR: accept every submitted report of a month in one go. */
export async function acceptAllSubmitted(db: Db, actor: Actor, period: Partial<Period>, category?: string) {
  assertDeputyRegistrar(actor);
  assertValidPeriod(period);
  const reports = await db.evaluationReport.findMany({
    where: { year: period.year, month: period.month, status: "SUBMITTED", ...(category ? { location: { category: category as never } } : {}) },
    select: { id: true },
  });
  const emails: EmailMessage[] = [];
  for (const report of reports) {
    const result = await reviewEvaluationReport(db, actor, report.id, "ACCEPT");
    emails.push(...result.emails);
  }
  return { accepted: reports.length, emails };
}
