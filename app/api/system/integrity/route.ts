import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { runSystemIntegrityChecks } from "@/lib/system-administration";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { appUser } = await requireRole("GAA");
    return NextResponse.json(await runSystemIntegrityChecks(prisma, appUser));
  } catch (error) {
    return apiErrorResponse(error, "Unable to run integrity checks.");
  }
}
