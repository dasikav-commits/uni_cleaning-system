import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { updateEvaluationRow } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

/** Saves one row of an evaluation report (ticks, quantities or remark). */
export async function PATCH(request: Request, context: RouteContext<"/api/evaluations/[id]/rows/[rowId]">) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    const { id, rowId } = await context.params;
    const body = await readJsonBody(request);
    const result = await updateEvaluationRow(prisma, appUser, id, rowId, {
      completedKeys: body.completedKeys,
      quantity: body.quantity,
      penaltyQuantity: body.penaltyQuantity,
      remark: body.remark,
      reset: body.reset,
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to save the row.");
  }
}
