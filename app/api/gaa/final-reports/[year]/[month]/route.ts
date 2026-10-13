import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getFinalReport } from "@/lib/final-reports";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; month: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const { year, month } = await params;
    return NextResponse.json(await getFinalReport(prisma, appUser, Number(year), Number(month)));
  } catch (error) {
    return apiErrorResponse(error, "Unable to load final report.");
  }
}
