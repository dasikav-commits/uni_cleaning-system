import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody } from "@/lib/api-errors";
import { createLocation } from "@/lib/boq-management";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    return NextResponse.json(await createLocation(prisma, appUser, await readJsonBody(request)), { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create the location.");
  }
}
