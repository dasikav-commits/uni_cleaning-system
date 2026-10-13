import { NextResponse } from "next/server";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { createCleaningWorker, listCleaningWorkers } from "@/lib/cleaning-workers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    await requireRole("GAA");
    const params = new URL(request.url).searchParams;
    const workers = await listCleaningWorkers(prisma, {
      query: params.get("query") ?? undefined,
      status: params.get("status") ?? undefined,
      locationId: params.get("locationId") ?? undefined,
    });
    return NextResponse.json({ workers });
  } catch (error) {
    return apiErrorResponse(error, "Unable to load cleaning workers.");
  }
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readJsonBody(request);
    const worker = await createCleaningWorker(prisma, { id: appUser.id, name: appUser.name }, {
      name: body.name,
      locationId: body.locationId,
      allocatedAmount: body.allocatedAmount,
    });
    return NextResponse.json({ worker }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create the cleaning worker.");
  }
}
