import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { getPhiMonthlyAttendanceReport } from "@/lib/phi-monthly-attendance";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("PHI");
    const report = await getPhiMonthlyAttendanceReport(prisma, { id: appUser.id, role: appUser.role }, (await params).id);
    if (!report) {
      return NextResponse.json({ error: "Report not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(error, "Unable to load the report.");
  }
}
