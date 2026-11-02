import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getEvaluationReport } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: RouteContext<"/api/evaluations/[id]">) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    const report = await getEvaluationReport(prisma, appUser, (await context.params).id);
    if (!report) return NextResponse.json({ error: "Report not found.", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    return apiErrorResponse(error, "Unable to load the evaluation report.");
  }
}
