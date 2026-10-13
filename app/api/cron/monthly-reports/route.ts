import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { generateMonthlyReportsForPeriod, getDefaultMonthlyGenerationOptions } from "@/lib/monthly-report-generation";
import { prisma } from "@/lib/prisma";

/**
 * Scheduled monthly processing for the previous month.
 *
 * Vercel Cron calls this route with GET and sends `Authorization: Bearer
 * $CRON_SECRET`, so both GET and POST are accepted and either CRON_SECRET or
 * MONTHLY_REPORT_CRON_SECRET may hold the shared secret. The schedule lives in
 * vercel.json. MONTHLY_REPORT_SYSTEM_ACTOR_ID must reference an existing user
 * (e.g. a GAA) that audit entries are attributed to.
 */
function isAuthorized(request: Request) {
  const authorization = request.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.MONTHLY_REPORT_CRON_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  return secrets.some((secret) => authorization === `Bearer ${secret}`);
}

async function runMonthlyProcessing(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const period = getDefaultMonthlyGenerationOptions();
    const result = await generateMonthlyReportsForPeriod(prisma, period);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to process monthly reports.");
  }
}

export const GET = runMonthlyProcessing;
export const POST = runMonthlyProcessing;
