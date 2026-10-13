import { NextResponse } from "next/server";
import { InvalidRequestError, apiErrorResponse, readJsonBody, stringField } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decideVcRecommendation, isVcDecision } from "@/lib/vc-review";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("VICE_CHANCELLOR");
    const body = await readJsonBody(request);
    const decision = body.decision;
    if (!isVcDecision(decision)) {
      throw new InvalidRequestError("decision must be APPROVE, REJECT or CLARIFICATION.");
    }
    const result = await decideVcRecommendation(
      prisma,
      appUser,
      (await params).id,
      decision,
      stringField(body, "remarks"),
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to record the decision.");
  }
}
