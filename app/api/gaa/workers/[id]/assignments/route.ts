import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { assignWorkerToLocation } from "@/lib/cleaning-workers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readJsonBody(request);
    const worker = await assignWorkerToLocation(prisma, { id: appUser.id, name: appUser.name }, (await params).id, {
      locationId: body.locationId,
      allocatedAmount: body.allocatedAmount,
    });
    return NextResponse.json({ worker });
  } catch (error) {
    return apiErrorResponse(error, "Unable to assign the worker.");
  }
}
