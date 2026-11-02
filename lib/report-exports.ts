import ExcelJS from "exceljs";
import { frequencyLabels } from "@/lib/evaluation-calc";
import type { getAttendanceReport, getWorkDoneReport, PaymentReportView } from "@/lib/monthly-process";
import { periodLabel } from "@/lib/periods";

const MONEY = "#,##0.00;(#,##0.00);\"-\"";
const SITE = "Kuliyapitiya Premises";

function money(cents: number | null) {
  return cents === null ? null : cents / 100;
}

function title(sheet: ExcelJS.Worksheet, lines: string[], width: number) {
  lines.forEach((line, index) => {
    const row = sheet.addRow([line]);
    sheet.mergeCells(row.number, 1, row.number, width);
    row.font = { bold: true, size: index === 0 ? 13 : 11 };
    row.alignment = { horizontal: "center" };
  });
  sheet.addRow([]);
}

function header(sheet: ExcelJS.Worksheet, values: string[]) {
  const row = sheet.addRow(values);
  row.font = { bold: true };
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  return row;
}

function borders(row: ExcelJS.Row, columns: number) {
  for (let column = 1; column <= columns; column += 1) {
    row.getCell(column).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  }
}

async function toBuffer(workbook: ExcelJS.Workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function newWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "University Cleaning Monitoring System";
  workbook.created = new Date();
  return workbook;
}

/** "Amount of work done - <month> - Kuliyapitiya Premises": one block per location. */
export async function workDoneWorkbook(view: Awaited<ReturnType<typeof getWorkDoneReport>>) {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet("Amount of work done", { pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [{ width: 8 }, { width: 8 }, { width: 70 }, { width: 14 }, { width: 16 }, { width: 10 }, { width: 16 }, { width: 30 }];
  title(sheet, [`Amount of work done - ${periodLabel(view.period)}`, SITE], 8);

  for (const section of view.sections) {
    const heading = sheet.addRow([`${section.boqNumber ?? ""}${section.boqNumber ? ". " : ""}${section.name}`]);
    sheet.mergeCells(heading.number, 1, heading.number, 8);
    heading.font = { bold: true, underline: true };
    header(sheet, ["Item", "Sub item", "Description", "Frequency", "Amount", "%", "Deduction", "Remark"]);

    for (const row of section.rows) {
      const rateBased = section.evaluationFormat === "RATE_BASED";
      const line = sheet.addRow([
        row.itemNo,
        row.subItem,
        rateBased && row.quantity !== null ? `${row.description} (${row.quantity} x ${row.unitLabel ?? "unit"})` : row.description,
        frequencyLabels[row.frequency],
        money(rateBased ? row.totalCents : row.amountCents),
        row.deductionPercent ? row.deductionPercent / 100 : null,
        money(row.deductionCents),
        row.filled ? row.remark ?? "" : "Not filled",
      ]);
      line.getCell(3).alignment = { wrapText: true, vertical: "top" };
      line.getCell(5).numFmt = MONEY;
      line.getCell(6).numFmt = "0.##%";
      line.getCell(7).numFmt = MONEY;
      borders(line, 8);
    }

    const total = sheet.addRow([
      "",
      "",
      section.status === "ACCEPTED" ? "Approved amount" : `Approved amount (${section.status ? section.status.toLowerCase() : "not started"})`,
      "",
      money(section.boqCents),
      "",
      money(section.status === "ACCEPTED" ? section.approvedCents : section.draftApprovedCents),
      "",
    ]);
    total.font = { bold: true };
    total.getCell(5).numFmt = MONEY;
    total.getCell(7).numFmt = MONEY;
    sheet.addRow([]);
  }

  return toBuffer(workbook);
}

/** Attendance report: deduction for absence from the approved PHI attendance. */
export async function attendanceWorkbook(view: Awaited<ReturnType<typeof getAttendanceReport>>) {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet("Attendance report");
  sheet.columns = [{ width: 58 }, { width: 14 }, { width: 14 }, { width: 18 }];
  title(sheet, [`Attendance report - ${periodLabel(view.period)}`, SITE, "Deduction for absence of the contractor's staff"], 4);
  header(sheet, ["Category", "No. of days", "Rate (Rs.)", "Amount (Rs.)"]);
  for (const category of view.categories) {
    const row = sheet.addRow([category.label, category.count, money(category.rateCents), money(category.totalCents)]);
    row.getCell(3).numFmt = MONEY;
    row.getCell(4).numFmt = MONEY;
    borders(row, 4);
  }
  const total = sheet.addRow(["Total deduction for absence", "", "", money(view.absenceCents)]);
  total.font = { bold: true };
  total.getCell(4).numFmt = MONEY;
  if (!view.approved) sheet.addRow(["The PHI attendance of this month has not been approved yet."]).font = { italic: true, color: { argb: "FFB91C1C" } };

  if (view.daily.length) {
    const daily = workbook.addWorksheet("Daily attendance");
    daily.columns = [{ width: 14 }, ...view.categories.map(() => ({ width: 18 }))];
    title(daily, [`PHI daily attendance - ${periodLabel(view.period)}`, SITE], view.categories.length + 1);
    header(daily, ["Date", ...view.categories.map((category) => category.label)]);
    for (const day of view.daily) {
      borders(daily.addRow([day.date, ...view.categories.map((category) => day.totals[category.key])]), view.categories.length + 1);
    }
    const sum = daily.addRow(["Total", ...view.categories.map((category) => view.dailyTotals[category.key])]);
    sum.font = { bold: true };
  }

  return toBuffer(workbook);
}

/** "Cleaning & Janitorial Services - <month>, Kuliyapitiya Premises" (final payment report). */
export async function paymentWorkbook(view: PaymentReportView) {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet("Cleaning & Janitorial Services", { pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  sheet.columns = [{ width: 6 }, { width: 64 }, { width: 18 }, { width: 18 }, { width: 18 }];
  title(
    sheet,
    [`Cleaning & Janitorial Services - ${periodLabel(view.period)}`, SITE, view.status === "FINALIZED" ? "Final" : "DRAFT - not finalized"],
    5,
  );
  header(sheet, ["No.", "Description", "Amount as per the BOQ (Rs.)", "Amount as per the Invoice (Rs.)", "Approved Amount (Rs.)"]);
  for (const line of view.lines) {
    const row = sheet.addRow([line.boqNumber ?? "", line.description, money(line.boqCents), money(line.invoiceCents), money(line.approvedCents)]);
    row.getCell(2).alignment = { wrapText: true };
    for (const column of [3, 4, 5]) row.getCell(column).numFmt = MONEY;
    borders(row, 5);
  }
  const totals: [string, number | null, number | null, number | null][] = [
    ["Total", view.totals.boqCents, view.totals.invoiceCents, view.totals.approvedCents],
    ["Less: Deduction for absence", null, null, -view.totals.absenceDeductionCents],
    ["Amount payable", null, null, view.totals.payableCents],
  ];
  for (const [label, boq, invoice, approved] of totals) {
    const row = sheet.addRow(["", label, money(boq), money(invoice), money(approved)]);
    row.font = { bold: true };
    for (const column of [3, 4, 5]) row.getCell(column).numFmt = MONEY;
    borders(row, 5);
  }
  if (view.remarks) {
    sheet.addRow([]);
    sheet.addRow(["", `Remarks: ${view.remarks}`]);
  }
  sheet.addRow([]);
  sheet.addRow([]);
  sheet.addRow(["", "......................................", "", "......................................"]);
  sheet.addRow(["", "Prepared by", "", "Deputy Registrar"]);

  return toBuffer(workbook);
}
