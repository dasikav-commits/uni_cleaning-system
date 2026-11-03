import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, requirePeriodValue, stringField } from "@/lib/api-errors";
import { queueEmails } from "@/lib/email";
import { acceptAllSubmitted } from "@/lib/evaluation-reports";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readJsonBody(request);
    const { emails, accepted } = await acceptAllSubmitted(prisma, appUser, requirePeriodValue(body.period), stringField(body, "category") || undefined);
    queueEmails(emails);
    return NextResponse.json({ accepted });
  } catch (error) {
    return apiErrorResponse(error, "Unable to accept the reports.");
  }
}
