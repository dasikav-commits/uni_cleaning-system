import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireAuthenticatedUser } from "@/lib/auth";
import { resubmitCorrectedReport } from "@/lib/monthly-report-corrections";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    const result = await resubmitCorrectedReport(prisma, appUser, (await params).id);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to resubmit the report.");
  }
}
