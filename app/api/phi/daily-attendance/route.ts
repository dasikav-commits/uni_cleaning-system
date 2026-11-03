import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, requirePeriodValue } from "@/lib/api-errors";
import { listDailyAttendance, saveDailyAttendance, totalsByCategory } from "@/lib/phi-daily-attendance";
import { prisma } from "@/lib/prisma";

/** Daily attendance of the signed-in PHI for ?period=YYYY-MM, with the month's totals by category. */
export async function GET(request: Request) {
  try {
    const { appUser } = await requireRole("PHI");
    const rows = await listDailyAttendance(prisma, appUser, requirePeriodValue(new URL(request.url).searchParams.get("period")));
    return NextResponse.json({ rows, totals: totalsByCategory(rows) });
  } catch (error) {
    return apiErrorResponse(error, "Unable to load the daily attendance.");
  }
}

export async function PUT(request: Request) {
  try {
    const { appUser } = await requireRole("PHI");
    const body = await readJsonBody(request);
    return NextResponse.json({ row: await saveDailyAttendance(prisma, appUser, { date: body.date, counts: body.counts, remark: body.remark }) });
  } catch (error) {
    return apiErrorResponse(error, "Unable to save the attendance.");
  }
}
