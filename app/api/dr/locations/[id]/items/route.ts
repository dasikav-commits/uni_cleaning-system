import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { createBoqItem } from "@/lib/boq-management";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, context: RouteContext<"/api/dr/locations/[id]/items">) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    return NextResponse.json(await createBoqItem(prisma, appUser, (await context.params).id, await readJsonBody(request)), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Unable to add the BOQ item.");
  }
}
