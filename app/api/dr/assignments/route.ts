import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, stringField } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { setReportingAssignment } from "@/lib/reporting-assignments";

/** DR: assign a login to a location (active: true) or remove it (active: false). */
export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readJsonBody(request);
    return NextResponse.json(
      await setReportingAssignment(prisma, appUser, {
        userId: stringField(body, "userId"),
        locationId: stringField(body, "locationId"),
        active: body.active !== false,
      }),
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to update the assignment.");
  }
}
