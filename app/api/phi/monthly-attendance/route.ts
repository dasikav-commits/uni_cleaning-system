import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import {
  PhiMonthlyAttendanceError,
  getPhiMonthlyAttendanceReportForPeriod,
  savePhiMonthlyAttendanceReport,
  type PhiMonthlyAttendanceRowInput,
} from "@/lib/phi-monthly-attendance";

const FALLBACK = "Unable to process PHI monthly attendance.";

export async function GET(request: Request) {
  try {
    const { appUser } = await requireRole("PHI");
    const url = new URL(request.url);
    const month = Number(url.searchParams.get("month") ?? "");
    const year = Number(url.searchParams.get("year") ?? "");
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1970) {
      throw new PhiMonthlyAttendanceError("INVALID_PERIOD", "A valid month and year are required.");
    }

    const report = await getPhiMonthlyAttendanceReportForPeriod(
      prisma,
      { id: appUser.id, role: appUser.role },
      month,
      year,
    );

    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(error, FALLBACK);
  }
}

function toRowInput(row: unknown): PhiMonthlyAttendanceRowInput {
  const record = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
  return {
    // The library validates every category against the official list.
    category: (typeof record.category === "string" ? record.category : "") as PhiMonthlyAttendanceRowInput["category"],
    employeeCount: record.employeeCount,
    deductionRate: record.deductionRate,
  };
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("PHI");
    const body = await readJsonBody(request);

    const report = await savePhiMonthlyAttendanceReport(
      prisma,
      {
        id: appUser.id,
        name: appUser.name,
        role: appUser.role,
        active: appUser.active,
      },
      {
        month: body.month,
        year: body.year,
        action: body.action === "submit" ? "submit" : "save",
        rows: Array.isArray(body.rows) ? body.rows.map(toRowInput) : [],
      },
    );

    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(error, FALLBACK);
  }
}
