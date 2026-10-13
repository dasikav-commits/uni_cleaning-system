import { NextResponse } from "next/server";
import { InvalidRequestError, readJsonBody } from "@/lib/api-errors";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPHIMonitoringData,
  savePHIAttendanceEvaluation,
  PHIAttendanceError,
} from "@/lib/phi-attendance-monitoring";

function toErrorResponse(error: unknown) {
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof AuthError || error instanceof PHIAttendanceError) {
    const code = "code" in error && typeof error.code === "string" ? error.code : "AUTH_ERROR";
    return NextResponse.json({ error: error.message, code }, { status: error.status });
  }

  return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { appUser } = await requireRole("PHI");
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") ?? "";
    const date = url.searchParams.get("date") ?? "";
    const data = await getPHIMonitoringData(prisma, appUser.id, locationId, date);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("PHI");
    const body = await readJsonBody(request);

    const result = await savePHIAttendanceEvaluation(
      prisma,
      {
        id: appUser.id,
        name: appUser.name,
        role: appUser.role,
        active: appUser.active,
      },
      {
        locationId: typeof body.locationId === "string" ? body.locationId : "",
        attendanceDate: typeof body.attendanceDate === "string" ? body.attendanceDate : "",
        totalPresentCount: body.totalPresentCount,
        remark: body.remark,
        finalize: typeof body.finalize === "boolean" ? body.finalize : false,
      },
    );

    return NextResponse.json({ attendanceEvaluation: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
