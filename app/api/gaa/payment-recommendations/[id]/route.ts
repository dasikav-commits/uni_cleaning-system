import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { getPaymentRecommendation, updateRecommendationRemarks } from "@/lib/payment-recommendations";
import { prisma } from "@/lib/prisma";

const FALLBACK = "Unable to process payment recommendation.";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const result = await getPaymentRecommendation(prisma, appUser, (await params).id);
    if (!result) return NextResponse.json({ error: "Recommendation not found.", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, FALLBACK);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readOptionalJsonBody(request);
    return NextResponse.json(
      await updateRecommendationRemarks(prisma, appUser, (await params).id, typeof body.remarks === "string" ? body.remarks : ""),
    );
  } catch (error) {
    return apiErrorResponse(error, FALLBACK);
  }
}
