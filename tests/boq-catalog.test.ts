import { describe, expect, it } from "vitest";
import { KULIYAPITIYA_BOQ } from "@/lib/boq-catalog";
import { centsToDecimalString, toCents } from "@/lib/evaluation-calc";

// Location totals of "Cleaning & Janitorial Services - March, Kuliyapitiya Premises" (Amount as per the BOQ).
const marchBoq: Record<number, string> = {
  1: "700000.00", 2: "565902.50", 3: "882896.30", 4: "282951.25", 5: "150000.00", 6: "113180.50",
  7: "169770.75", 8: "169770.75", 9: "169770.75", 10: "226361.00", 11: "226361.00", 12: "226361.00",
  13: "226361.00", 14: "226361.00", 15: "282951.25", 16: "81000.00", 17: "900000.00", 18: "50000.00",
  19: "226361.00", 20: "130000.00", 21: "141312.25", 22: "81000.00", 23: "85313.18", 24: "282951.25",
  25: "282951.25", 26: "400000.00", 27: "100000.00", 28: "18750.00",
};

function locationBoqCents(location: (typeof KULIYAPITIYA_BOQ)[number]) {
  if (location.boqAmount) return toCents(location.boqAmount);
  return location.items.reduce((sum, item) => sum + toCents(item.monthlyAmount), 0);
}

describe("Kuliyapitiya BOQ catalog", () => {
  it("has the 28 services numbered 1-28 with unique codes", () => {
    expect(KULIYAPITIYA_BOQ.map((location) => location.boqNumber)).toEqual(Array.from({ length: 28 }, (_, index) => index + 1));
    expect(new Set(KULIYAPITIYA_BOQ.map((location) => location.code)).size).toBe(28);
  });

  it("matches the BOQ amount of every location in the March report", () => {
    for (const location of KULIYAPITIYA_BOQ) {
      expect(centsToDecimalString(locationBoqCents(location)), `${location.boqNumber} ${location.name}`).toBe(marchBoq[location.boqNumber]);
    }
  });

  it("adds up to the monthly BOQ total of Rs. 7,398,637.98", () => {
    const total = KULIYAPITIYA_BOQ.reduce((sum, location) => sum + locationBoqCents(location), 0);
    expect(centsToDecimalString(total)).toBe("7398637.98");
  });

  it("uses the rate-based format only for toilet pits and stray animals", () => {
    expect(KULIYAPITIYA_BOQ.filter((location) => location.evaluationFormat === "RATE_BASED").map((location) => location.boqNumber)).toEqual([27, 28]);
  });
});
