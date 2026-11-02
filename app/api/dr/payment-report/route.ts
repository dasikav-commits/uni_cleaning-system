import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, requirePeriodValue } from "@/lib/api-errors";
import { queueEmails } from "@/lib/email";
import { finalizePaymentReport, reopenPaymentReport, savePaymentDraft } from "@/lib/monthly-process";
import { prisma } from "@/lib/prisma";

/** Save invoice amounts / remarks of the draft Cleaning & Janitorial Services report. */
export async function PATCH(request: Request) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readJsonBody(request);
    const invoices = typeof body.invoices === "object" && body.invoices !== null ? (body.invoices as Record<string, unknown>) : undefined;
    return NextResponse.json({ report: await savePaymentDraft(prisma, appUser, requirePeriodValue(body.period), { invoices, remarks: body.remarks }) });
  } catch (error) {
    return apiErrorResponse(error, "Unable to save the report.");
  }
}

/** Finalize or reopen the report. */
export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const body = await readJsonBody(request);
    const period = requirePeriodValue(body.period);
    if (body.action === "finalize") {
      const { report, emails } = await finalizePaymentReport(prisma, appUser, period);
      queueEmails(emails);
      return NextResponse.json({ report });
    }
    if (body.action === "reopen") {
      return NextResponse.json({ report: await reopenPaymentReport(prisma, appUser, period, body.reason) });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update the report.");
  }
}
