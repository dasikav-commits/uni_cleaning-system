import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { PageHeader } from "@/app/_components/ui";
import { getBusinessDateString } from "@/lib/business-date";
import { requirePageUser } from "@/lib/page-auth";
import { listDailyAttendance } from "@/lib/phi-daily-attendance";
import { isPhiMonthlyAttendanceLocked, phiMonthlyStatusLabel } from "@/lib/phi-monthly-attendance-categories";
import { currentPeriod, periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { DailyAttendanceGrid } from "./daily-attendance-grid";

export default async function PhiDailyAttendancePage({ searchParams }: PageProps<"/phi/daily-attendance">) {
  const appUser = await requirePageUser(["PHI"]);
  const params = await searchParams;
  // The daily sheet defaults to the current month (the other pages default to the month being reported).
  const period = periodFromSearchParam(params.period, currentPeriod());
  const [rows, monthly] = await Promise.all([
    listDailyAttendance(prisma, appUser, period),
    prisma.phiMonthlyAttendanceReport.findUnique({
      where: { phiUserId_month_year: { phiUserId: appUser.id, month: period.month, year: period.year } },
      select: { id: true, status: true },
    }),
  ]);
  const locked = isPhiMonthlyAttendanceLocked(monthly?.status);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="PHI"
          title={`Daily attendance - ${periodLabel(period)}`}
          description={
            <>
              Enter the number of the contractor&apos;s staff on half day or absent each day. At the end of the month, open{" "}
              <Link href={`/phi/monthly-attendance?month=${period.month}&year=${period.year}`} className="font-semibold text-cyan-700">
                Monthly attendance
              </Link>{" "}
              and use &quot;Load totals from daily attendance&quot;.
              {monthly ? ` Monthly report: ${phiMonthlyStatusLabel(monthly.status)}.` : ""}
            </>
          }
          actions={<PeriodPicker period={period} />}
        />
        <DailyAttendanceGrid
          key={periodKey(period)}
          period={periodKey(period)}
          today={getBusinessDateString()}
          locked={locked}
          initialRows={rows.map((row) => ({ date: row.date, counts: row.counts, remark: row.remark }))}
        />
      </div>
    </AppShell>
  );
}
