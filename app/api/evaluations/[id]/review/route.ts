import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { queueEmails } from "@/lib/email";
import { reviewEvaluationReport } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

/** DR: accept a report, return it for correction, or reopen an accepted one (RETURN). */
export async function POST(request: Request, context: RouteContext<"/api/evaluations/[id]/review">) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readJsonBody(request);
    const decision = body.decision === "ACCEPT" ? "ACCEPT" : body.decision === "RETURN" ? "RETURN" : null;
    if (!decision) return NextResponse.json({ error: "Choose accept or return." }, { status: 400 });
    const { emails, ...result } = await reviewEvaluationReport(prisma, appUser, (await context.params).id, decision, body.reason);
    queueEmails(emails);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to review the report.");
  }
}
