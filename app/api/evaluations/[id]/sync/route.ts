import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { syncEvaluationReportWithBoq } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

/** Brings an editable report in line with the current BOQ. */
export async function POST(_: Request, context: RouteContext<"/api/evaluations/[id]/sync">) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    return NextResponse.json(await syncEvaluationReportWithBoq(prisma, appUser, (await context.params).id));
  } catch (error) {
    return apiErrorResponse(error, "Unable to update the report from the BOQ.");
  }
}
