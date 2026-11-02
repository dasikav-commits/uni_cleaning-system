// Client-safe calculation engine for evaluation reports and the monthly reports.
// Money is handled in integer cents so totals always add up exactly.
import { daysInMonth, type Period } from "@/lib/periods";

export const boqFrequencies = [
  "TWICE_DAILY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "ANNUAL",
  "WHEN_NECESSARY",
  "ON_REQUEST",
  "PER_SERVICE",
] as const;

export type BoqFrequencyKey = (typeof boqFrequencies)[number];

export const frequencyLabels: Record<BoqFrequencyKey, string> = {
  TWICE_DAILY: "Twice a day",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  ANNUAL: "Once a year",
  WHEN_NECESSARY: "When necessary",
  ON_REQUEST: "On request",
  PER_SERVICE: "Per service",
};

export function isBoqFrequency(value: string): value is BoqFrequencyKey {
  return (boqFrequencies as readonly string[]).includes(value);
}

export type Occurrence = {
  key: string;
  label: string;
  /** Day of month for daily occurrences (used to lay the pop-up out as a calendar). */
  day?: number;
  weekday?: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weeks of the month: 1-7, 8-14, 15-21, 22-end. */
export function weekRanges(period: Period) {
  const last = daysInMonth(period);
  return [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, last],
  ] as const;
}

/**
 * Every occurrence of a BOQ row that has to be carried out in the month.
 * The evaluator ticks the ones that were done; the rest are deducted.
 */
export function occurrencesFor(frequency: BoqFrequencyKey, period: Period): Occurrence[] {
  const days = daysInMonth(period);
  const weekday = (day: number) => WEEKDAYS[new Date(Date.UTC(period.year, period.month - 1, day)).getUTCDay()];

  switch (frequency) {
    case "TWICE_DAILY":
      return Array.from({ length: days }, (_, index) => index + 1).flatMap((day) => [
        { key: `d${day}-am`, label: "AM", day, weekday: weekday(day) },
        { key: `d${day}-pm`, label: "PM", day, weekday: weekday(day) },
      ]);
    case "DAILY":
      return Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        return { key: `d${day}`, label: String(day), day, weekday: weekday(day) };
      });
    case "WEEKLY":
      return weekRanges(period).map(([start, end], index) => ({
        key: `w${index + 1}`,
        label: `Week ${index + 1} (${start}-${end})`,
      }));
    case "MONTHLY":
      return [{ key: "m", label: "Done this month" }];
    case "ANNUAL":
      return [{ key: "m", label: "Annual work done (normally in August)" }];
    case "WHEN_NECESSARY":
      return [{ key: "m", label: "Attended to whenever required" }];
    case "ON_REQUEST":
      return [{ key: "m", label: "Completed as requested" }];
    case "PER_SERVICE":
      return [];
  }
}

// ---------------------------------------------------------------------------
// Money helpers
// ---------------------------------------------------------------------------

/** Converts "1,234.56", 1234.56 or a Prisma Decimal to integer cents. */
export function toCents(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const text = typeof value === "number" ? value.toFixed(2) : String(value).replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return NaN;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2)) + (Number(fraction[2] ?? 0) >= 5 ? 1 : 0);
  return negative ? -cents : cents;
}

/** Integer cents to a "1234.56" string (for Prisma Decimal columns). */
export function centsToDecimalString(cents: number) {
  const negative = cents < 0;
  const absolute = Math.abs(Math.round(cents));
  return `${negative ? "-" : ""}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

const moneyFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1,234.56"; zero is shown as "-" like the printed reports. */
export function formatMoney(cents: number, { dashForZero = true }: { dashForZero?: boolean } = {}) {
  if (!Number.isFinite(cents)) return "-";
  if (cents === 0 && dashForZero) return "-";
  const formatted = moneyFormatter.format(Math.abs(cents) / 100);
  return cents < 0 ? `(${formatted})` : formatted;
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return "";
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0$/, "")}%`;
}

// ---------------------------------------------------------------------------
// Row calculations
// ---------------------------------------------------------------------------

export type ScheduledRowResult = {
  scheduledCount: number;
  completedCount: number;
  missedCount: number;
  completedKeys: string[];
  deductionPercent: number;
  deductionCents: number;
  totalCents: number;
};

/**
 * Deduction % = missed occurrences / scheduled occurrences.
 * Deduction = monthly amount x missed / scheduled (rounded to the cent).
 */
export function calculateScheduledRow(
  amountCents: number,
  frequency: BoqFrequencyKey,
  period: Period,
  completedKeys: readonly string[],
): ScheduledRowResult {
  const occurrences = occurrencesFor(frequency, period);
  const valid = new Set(occurrences.map((occurrence) => occurrence.key));
  const done = occurrences.map((occurrence) => occurrence.key).filter((key) => completedKeys.includes(key) && valid.has(key));
  const scheduledCount = occurrences.length;
  const completedCount = done.length;
  const missedCount = scheduledCount - completedCount;
  const deductionCents = scheduledCount ? Math.round((amountCents * missedCount) / scheduledCount) : 0;
  const deductionPercent = scheduledCount ? Math.round((missedCount * 10000) / scheduledCount) / 100 : 0;
  return {
    scheduledCount,
    completedCount,
    missedCount,
    completedKeys: done,
    deductionPercent,
    deductionCents,
    totalCents: amountCents - deductionCents,
  };
}

export type RateRowResult = {
  amountCents: number;
  penaltyCents: number;
  totalCents: number;
};

/** RATE_BASED rows: quantity x rate, less the fine for units not delivered. */
export function calculateRateRow(
  unitRateCents: number | null,
  quantity: number,
  penaltyRateCents: number | null,
  penaltyQuantity: number,
): RateRowResult {
  const amountCents = (unitRateCents ?? 0) * quantity;
  const penaltyCents = (penaltyRateCents ?? 0) * penaltyQuantity;
  return { amountCents, penaltyCents, totalCents: amountCents - penaltyCents };
}

/** Planned monthly amount of a RATE_BASED BOQ row (rate x planned per year / 12). */
export function plannedMonthlyCents(unitRateCents: number | null, plannedPerYear: number | null) {
  if (!unitRateCents || !plannedPerYear) return 0;
  return Math.round((unitRateCents * plannedPerYear) / 12);
}

export type RowState = "blank" | "complete" | "deducted";

/** Colour state of a row: blank (not filled), complete (green) or deducted (red). */
export function rowState(row: { filled: boolean; deductionCents: number; penaltyQuantity?: number | null }): RowState {
  if (!row.filled) return "blank";
  if (row.deductionCents > 0 || (row.penaltyQuantity ?? 0) > 0) return "deducted";
  return "complete";
}

// ---------------------------------------------------------------------------
// Final report arithmetic
// ---------------------------------------------------------------------------

export type PaymentLineAmounts = { boqCents: number; invoiceCents: number; approvedCents: number };

export function summarizePaymentLines(lines: readonly PaymentLineAmounts[], absenceDeductionCents: number) {
  const boqCents = lines.reduce((sum, line) => sum + line.boqCents, 0);
  const invoiceCents = lines.reduce((sum, line) => sum + line.invoiceCents, 0);
  const approvedCents = lines.reduce((sum, line) => sum + line.approvedCents, 0);
  return { boqCents, invoiceCents, approvedCents, absenceDeductionCents, payableCents: approvedCents - absenceDeductionCents };
}
