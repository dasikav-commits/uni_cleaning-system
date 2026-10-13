import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { listPhiMonthlyAttendanceReports } from "@/lib/phi-monthly-attendance";

export async function GET(request: Request) {
  try {
    const { appUser } = await requireRole("ADMINISTRATION_OFFICER");
    const url = new URL(request.url);
    const number = (key: string) => {
      const value = Number(url.searchParams.get(key) ?? "");
      return Number.isInteger(value) && value > 0 ? value : undefined;
    };
    const data = await listPhiMonthlyAttendanceReports(
      prisma,
      { id: appUser.id, role: appUser.role },
      { month: number("month"), year: number("year"), page: number("page") },
    );
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error, "Unable to load PHI monthly attendance reports.");
  }
}
