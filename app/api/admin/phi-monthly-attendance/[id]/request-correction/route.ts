import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { decidePhiMonthlyAttendanceReport } from "@/lib/phi-monthly-attendance";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("ADMINISTRATION_OFFICER");
    const body = await readOptionalJsonBody(request);
    const result = await decidePhiMonthlyAttendanceReport(
      prisma,
      { id: appUser.id, name: appUser.name, role: appUser.role, active: appUser.active },
      (await params).id,
      "CORRECTION",
      typeof body.remarks === "string" ? body.remarks : undefined,
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to complete this review.");
  }
}
