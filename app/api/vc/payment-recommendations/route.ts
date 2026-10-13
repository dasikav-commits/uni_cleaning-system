import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listVcRecommendations, type VcRecommendationFilter } from "@/lib/vc-review";

export async function GET(request: Request) {
  try {
    const { appUser } = await requireRole("VICE_CHANCELLOR");
    const filterParam = new URL(request.url).searchParams.get("filter");
    const filter: VcRecommendationFilter =
      filterParam === "decided" || filterParam === "all" ? filterParam : "pending";
    return NextResponse.json({ recommendations: await listVcRecommendations(prisma, appUser, filter) });
  } catch (error) {
    return apiErrorResponse(error, "Unable to load payment recommendations.");
  }
}
