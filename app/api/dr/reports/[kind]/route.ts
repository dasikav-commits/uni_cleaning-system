import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, requirePeriodValue } from "@/lib/api-errors";
import { getAttendanceReport, getPaymentReport, getWorkDoneReport } from "@/lib/monthly-process";
import { periodKey } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { attendanceWorkbook, paymentWorkbook, workDoneWorkbook } from "@/lib/report-exports";

/** Excel download of the DR reports: /api/dr/reports/{work-done|attendance|final}?period=YYYY-MM */
export async function GET(request: Request, context: RouteContext<"/api/dr/reports/[kind]">) {
  try {
    const { appUser } = await requireRole("DEPUTY_REGISTRAR");
    const { kind } = await context.params;
    const period = requirePeriodValue(new URL(request.url).searchParams.get("period"));

    let buffer: Buffer;
    let name: string;
    if (kind === "work-done") {
      buffer = await workDoneWorkbook(await getWorkDoneReport(prisma, period));
      name = "Amount-of-work-done";
    } else if (kind === "attendance") {
      buffer = await attendanceWorkbook(await getAttendanceReport(prisma, appUser, period));
      name = "Attendance-report";
    } else if (kind === "final") {
      buffer = await paymentWorkbook(await getPaymentReport(prisma, period));
      name = "Cleaning-and-Janitorial-Services";
    } else {
      return NextResponse.json({ error: "Unknown report." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}-${periodKey(period)}-Kuliyapitiya.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Unable to export the report.");
  }
}
