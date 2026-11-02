import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { importKuliyapitiyaBoq } from "@/lib/boq-management";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readOptionalJsonBody(request);
    return NextResponse.json(await importKuliyapitiyaBoq(prisma, appUser, { replaceItems: body.replaceItems === true }));
  } catch (error) {
    return apiErrorResponse(error, "Unable to import the BOQ.");
  }
}
