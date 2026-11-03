import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { PrintButton } from "@/app/_components/print-button";
import { Card, EmptyState, Money, PageHeader, PhiStatusBadge } from "@/app/_components/ui";
import { getAttendanceReport } from "@/lib/monthly-process";
import { requirePageUser } from "@/lib/page-auth";
import { periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";

export default async function AttendanceReportPage({ searchParams }: PageProps<"/dr/reports/attendance">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const period = periodFromSearchParam(params.period);
  const view = await getAttendanceReport(prisma, appUser, period);
  const key = periodKey(period);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 print-report">
        <PageHeader
          eyebrow="Step 5 · Deputy Registrar"
          title={`Attendance report - ${periodLabel(period)}`}
          description="Deduction for the absence and half days of the contractor's staff, taken from the PHI monthly attendance approved by the Deputy Registrar. This amount is deducted in the Cleaning & Janitorial Services report."
          actions={
            <>
              <PeriodPicker period={period} />
              <a href={`/api/dr/reports/attendance?period=${key}`} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Download Excel
              </a>
              <PrintButton />
            </>
          }
        />

        <Card title="PHI monthly attendance received">
          {view.reports.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {view.reports.map((report) => (
                <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="font-medium text-slate-900">{report.phiName}</span>
                  <span className="flex items-center gap-3">
                    <Money cents={report.grandTotalCents} dash={false} />
                    <PhiStatusBadge status={report.status} />
                    <Link href={`/dr/phi-attendance/${report.id}`} className="text-xs font-semibold text-cyan-700 print:hidden">
                      {report.status === "SUBMITTED" || report.status === "RESUBMITTED" ? "Review" : "Open"}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>The PHI has not sent the monthly attendance for {periodLabel(period)} yet.</EmptyState>
          )}
        </Card>

        <Card title="Deduction for absence" description={view.approved ? undefined : "Shown as zero until the PHI attendance is approved."}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr>
                  <th className="th">Category</th>
                  <th className="th text-right">No. of days</th>
                  <th className="th text-right">Rate (Rs.)</th>
                  <th className="th text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.categories.map((category) => (
                  <tr key={category.key}>
                    <td className="td">{category.label}</td>
                    <td className="td text-right tabular-nums">{category.count}</td>
                    <td className="td text-right">
                      <Money cents={category.rateCents} />
                    </td>
                    <td className="td text-right">
                      <Money cents={category.totalCents} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-950">
                <tr>
                  <td className="td" colSpan={3}>
                    Total deduction for absence
                  </td>
                  <td className="td text-right">
                    <Money cents={view.absenceCents} dash={false} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="Daily attendance (from the PHI daily sheet)" description="Number of staff on half day or absent on each day, for checking against the monthly totals.">
          {view.daily.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    {view.categories.map((category) => (
                      <th key={category.key} className="th whitespace-normal text-right">
                        {category.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {view.daily.map((day) => (
                    <tr key={day.date}>
                      <td className="td whitespace-nowrap">{day.date}</td>
                      {view.categories.map((category) => (
                        <td key={category.key} className="td text-right tabular-nums">
                          {day.totals[category.key] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="td">Total</td>
                    {view.categories.map((category) => (
                      <td key={category.key} className="td text-right tabular-nums">
                        {view.dailyTotals[category.key]}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <EmptyState>No daily attendance was entered for this month.</EmptyState>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
