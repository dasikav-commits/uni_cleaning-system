import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { updateBoqItem } from "@/lib/boq-management";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: RouteContext<"/api/dr/boq-items/[id]">) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    return NextResponse.json(await updateBoqItem(prisma, appUser, (await context.params).id, await readJsonBody(request)));
  } catch (error) {
    return apiErrorResponse(error, "Unable to update the BOQ item.");
  }
}
