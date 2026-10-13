import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { finalizePaymentRecommendation } from "@/lib/payment-recommendations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readOptionalJsonBody(request);
    return NextResponse.json(
      await finalizePaymentRecommendation(prisma, appUser, (await params).id, typeof body.remarks === "string" ? body.remarks : ""),
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to finalize recommendation.");
  }
}
