import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVcRecommendation } from "@/lib/vc-review";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("VICE_CHANCELLOR");
    const recommendation = await getVcRecommendation(prisma, appUser, (await params).id);
    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(recommendation);
  } catch (error) {
    return apiErrorResponse(error, "Unable to load the payment recommendation.");
  }
}
