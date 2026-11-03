import { describe, expect, it } from "vitest";
import {
  calculateRateRow,
  calculateScheduledRow,
  centsToDecimalString,
  formatMoney,
  occurrencesFor,
  plannedMonthlyCents,
  rowState,
  summarizePaymentLines,
  toCents,
} from "@/lib/evaluation-calc";
import { periodFromSearchParam, parsePeriodKey, previousPeriod } from "@/lib/periods";

const march = { year: 2026, month: 3 };
const february = { year: 2026, month: 2 };

describe("occurrences to tick", () => {
  it("lists every day, both shifts, four weeks or one monthly tick", () => {
    expect(occurrencesFor("DAILY", march)).toHaveLength(31);
    expect(occurrencesFor("DAILY", february)).toHaveLength(28);
    expect(occurrencesFor("TWICE_DAILY", march)).toHaveLength(62);
    expect(occurrencesFor("WEEKLY", march).map((occurrence) => occurrence.label)).toEqual([
      "Week 1 (1-7)",
      "Week 2 (8-14)",
      "Week 3 (15-21)",
      "Week 4 (22-31)",
    ]);
    expect(occurrencesFor("MONTHLY", march)).toHaveLength(1);
    expect(occurrencesFor("ON_REQUEST", march)).toHaveLength(1);
    expect(occurrencesFor("PER_SERVICE", march)).toHaveLength(0);
  });

  it("marks the weekday of daily occurrences (1 March 2026 is a Sunday)", () => {
    expect(occurrencesFor("DAILY", march)[0]).toMatchObject({ key: "d1", day: 1, weekday: "Sun" });
    expect(occurrencesFor("TWICE_DAILY", march)[1]).toMatchObject({ key: "d1-pm", label: "PM" });
  });
});

describe("scheduled rows (tick format)", () => {
  it("is complete (green) with no deduction when everything is ticked", () => {
    const keys = occurrencesFor("DAILY", march).map((occurrence) => occurrence.key);
    const result = calculateScheduledRow(toCents("50000"), "DAILY", march, keys);
    expect(result).toMatchObject({ scheduledCount: 31, completedCount: 31, deductionPercent: 0, deductionCents: 0, totalCents: 5_000_000 });
    expect(rowState({ filled: true, deductionCents: result.deductionCents })).toBe("complete");
  });

  it("deducts missed / scheduled of the amount (red)", () => {
    // Weekly item of Rs. 60,000: one week missed = 25 % = Rs. 15,000.
    const result = calculateScheduledRow(toCents("60000"), "WEEKLY", march, ["w1", "w2", "w4"]);
    expect(result).toMatchObject({ missedCount: 1, deductionPercent: 25, deductionCents: 1_500_000, totalCents: 4_500_000 });
    expect(rowState({ filled: true, deductionCents: result.deductionCents })).toBe("deducted");
  });

  it("rounds to the cent and ignores keys that do not belong to the month", () => {
    // 3 of 31 days missed on Rs. 10,000 = 967.741... -> 967.74
    const keys = occurrencesFor("DAILY", march).map((occurrence) => occurrence.key).slice(3);
    const result = calculateScheduledRow(toCents("10000"), "DAILY", march, [...keys, "d40", "w1"]);
    expect(result.completedCount).toBe(28);
    expect(centsToDecimalString(result.deductionCents)).toBe("967.74");
    expect(result.deductionPercent).toBe(9.68);
    expect(result.deductionCents + result.totalCents).toBe(1_000_000);
  });

  it("deducts the full amount when a monthly item was not done", () => {
    expect(calculateScheduledRow(toCents("47951.25"), "MONTHLY", march, [])).toMatchObject({ deductionPercent: 100, deductionCents: 4_795_125, totalCents: 0 });
  });

  it("treats an unfilled row as blank", () => {
    expect(rowState({ filled: false, deductionCents: 0 })).toBe("blank");
  });
});

describe("rate-based rows (toilet pits, dogs & cats)", () => {
  it("pays quantity x rate less the fine for animals not removed", () => {
    expect(calculateRateRow(750_000, 3, 750_000, 1)).toEqual({ amountCents: 2_250_000, penaltyCents: 750_000, totalCents: 1_500_000 });
    expect(calculateRateRow(null, 0, null, 0).totalCents).toBe(0);
  });

  it("derives the planned monthly amount from the yearly plan", () => {
    // 20 dogs + 10 cats a year at Rs. 7,500 = Rs. 18,750 a month.
    expect(plannedMonthlyCents(750_000, 20) + plannedMonthlyCents(750_000, 10)).toBe(1_875_000);
  });
});

describe("Cleaning & Janitorial Services report (March, Kuliyapitiya)", () => {
  const approved = [
    "640000", "512202.50", "682896.30", "232951.25", "102500", "95680.50", "123480", "136000", "123480", "160000",
    "198150", "226361", "197700", "156800", "135000", "81000", "900000", "50000", "215000", "115000", "68050",
    "40000", "0", "252951.25", "112951.25", "374000", "22563.04", "0",
  ];

  it("reproduces the approved total, the absence deduction and the payable amount", () => {
    const lines = approved.map((amount) => ({ boqCents: 0, invoiceCents: 0, approvedCents: toCents(amount) }));
    const totals = summarizePaymentLines(lines, toCents("823290"));
    expect(centsToDecimalString(totals.approvedCents)).toBe("5954717.09");
    expect(centsToDecimalString(totals.payableCents)).toBe("5131427.09");
  });
});

describe("money helpers", () => {
  it("parses amounts exactly", () => {
    expect(toCents("1,234.56")).toBe(123_456);
    expect(toCents("69902.5")).toBe(6_990_250);
    expect(toCents("0.995")).toBe(100);
    expect(toCents(18750)).toBe(1_875_000);
    expect(toCents("abc")).toBeNaN();
    expect(toCents(null)).toBe(0);
  });

  it("formats like the printed reports", () => {
    expect(formatMoney(595_471_709)).toBe("5,954,717.09");
    expect(formatMoney(0)).toBe("-");
    expect(formatMoney(0, { dashForZero: false })).toBe("0.00");
    expect(formatMoney(-82_329_000)).toBe("(823,290.00)");
  });
});

describe("periods", () => {
  it("parses ?period=YYYY-MM and never returns a future month", () => {
    expect(parsePeriodKey("2026-03")).toEqual(march);
    expect(parsePeriodKey("2026-13")).toBeNull();
    expect(periodFromSearchParam("2026-03")).toEqual(march);
    expect(periodFromSearchParam("2999-01")).not.toEqual({ year: 2999, month: 1 });
    expect(previousPeriod({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
  });
});
