import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, stringField } from "@/lib/api-errors";
import { PaymentRecommendationError, updateRecommendationAllocation } from "@/lib/payment-recommendations";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readJsonBody(request);
    const calculationId = stringField(body, "calculationId").trim();
    if (!calculationId) {
      throw new PaymentRecommendationError("NOT_FOUND", "Task calculation was not found.", 404);
    }
    const amount = typeof body.amount === "number" ? String(body.amount) : stringField(body, "amount").trim();
    return NextResponse.json(
      await updateRecommendationAllocation(prisma, appUser, (await params).id, calculationId, amount, stringField(body, "reason")),
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to update allocation.");
  }
}
