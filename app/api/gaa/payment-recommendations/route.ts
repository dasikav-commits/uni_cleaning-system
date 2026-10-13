import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { createPaymentRecommendation, listGaaEligibleReports } from "@/lib/payment-recommendations";
import { prisma } from "@/lib/prisma";

const FALLBACK = "Unable to process payment recommendation.";

export async function GET() {
  try {
    const { appUser } = await requireRole("GAA");
    return NextResponse.json(await listGaaEligibleReports(prisma, appUser));
  } catch (error) {
    return apiErrorResponse(error, FALLBACK);
  }
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readOptionalJsonBody(request);
    if (typeof body.reportId !== "string" || !body.reportId.trim()) {
      return NextResponse.json({ error: "reportId is required.", code: "INVALID_REQUEST" }, { status: 400 });
    }
    return NextResponse.json(await createPaymentRecommendation(prisma, appUser, body.reportId.trim()));
  } catch (error) {
    return apiErrorResponse(error, FALLBACK);
  }
}
