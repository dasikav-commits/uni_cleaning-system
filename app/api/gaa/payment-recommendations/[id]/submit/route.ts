import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { submitPaymentRecommendation } from "@/lib/payment-recommendations";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    return NextResponse.json(await submitPaymentRecommendation(prisma, appUser, (await params).id));
  } catch (error) {
    return apiErrorResponse(error, "Unable to submit recommendation.");
  }
}
