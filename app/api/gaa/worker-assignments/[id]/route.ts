import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { updateWorkerAssignment } from "@/lib/cleaning-workers";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readJsonBody(request);
    const worker = await updateWorkerAssignment(prisma, { id: appUser.id, name: appUser.name }, (await params).id, {
      allocatedAmount: body.allocatedAmount,
      active: body.active,
    });
    return NextResponse.json({ worker });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update the assignment.");
  }
}
