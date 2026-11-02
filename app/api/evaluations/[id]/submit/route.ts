import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { queueEmails } from "@/lib/email";
import { submitEvaluationReport } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

/** Sends a completed evaluation report to the Deputy Registrar. */
export async function POST(request: Request, context: RouteContext<"/api/evaluations/[id]/submit">) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    const body = await readOptionalJsonBody(request);
    const { emails, ...result } = await submitEvaluationReport(prisma, appUser, (await context.params).id, body.remarks);
    queueEmails(emails);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to send the report.");
  }
}
