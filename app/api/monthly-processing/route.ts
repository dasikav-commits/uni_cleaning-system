import { NextResponse } from "next/server";
import { InvalidRequestError, apiErrorResponse, readOptionalJsonBody } from "@/lib/api-errors";
import { requireRole } from "@/lib/auth";
import { generateMonthlyReportsForPeriod, getDefaultMonthlyGenerationOptions } from "@/lib/monthly-report-generation";
import { prisma } from "@/lib/prisma";

function toInteger(value: unknown) {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isInteger(number) ? number : undefined;
}

export async function POST(request: Request) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readOptionalJsonBody(request);
    const fallback = getDefaultMonthlyGenerationOptions();
    const month = body.month === undefined ? fallback.month : toInteger(body.month);
    const year = body.year === undefined ? fallback.year : toInteger(body.year);
    if (month === undefined || month < 1 || month > 12 || year === undefined || year < 2000 || year > 9999) {
      throw new InvalidRequestError("Provide a valid month (1-12) and year.");
    }
    const result = await generateMonthlyReportsForPeriod(prisma, { month, year, actorUserId: appUser.id });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "Unable to process monthly reports.");
  }
}
