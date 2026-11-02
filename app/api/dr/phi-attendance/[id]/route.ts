import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import type { EmailMessage } from "@/lib/email";
import { queueEmails } from "@/lib/email";
import { decidePhiMonthlyAttendanceReport } from "@/lib/phi-monthly-attendance";
import { prisma } from "@/lib/prisma";

/** DR review of a PHI monthly attendance report. */
export async function POST(request: Request, context: RouteContext<"/api/dr/phi-attendance/[id]">) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readJsonBody(request);
    const decision = body.decision === "APPROVE" || body.decision === "CORRECTION" || body.decision === "REJECT" ? body.decision : null;
    if (!decision) return NextResponse.json({ error: "Choose approve, correction or reject." }, { status: 400 });
    const outbox: EmailMessage[] = [];
    const result = await decidePhiMonthlyAttendanceReport(
      prisma,
      appUser,
      (await context.params).id,
      decision,
      typeof body.remarks === "string" ? body.remarks : undefined,
      outbox,
    );
    queueEmails(outbox);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    return apiErrorResponse(error, "Unable to review the attendance report.");
  }
}
