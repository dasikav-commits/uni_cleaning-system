import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, requirePeriodValue, stringField } from "@/lib/api-errors";
import { startEvaluationReport } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

/** Opens (or creates from the BOQ) the evaluation report of a location for a month. */
export async function POST(request: Request) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    const body = await readJsonBody(request);
    const report = await startEvaluationReport(prisma, appUser, stringField(body, "locationId"), requirePeriodValue(body.period));
    return NextResponse.json({ id: report.id });
  } catch (error) {
    return apiErrorResponse(error, "Unable to open the evaluation report.");
  }
}
