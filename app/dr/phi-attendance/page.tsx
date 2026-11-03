import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState, Money, PageHeader, PhiStatusBadge } from "@/app/_components/ui";
import { toCents } from "@/lib/evaluation-calc";
import { requirePageUser } from "@/lib/page-auth";
import { listPhiMonthlyAttendanceReports } from "@/lib/phi-monthly-attendance";
import { periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";

export default async function DrPhiAttendancePage({ searchParams }: PageProps<"/dr/phi-attendance">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);
  const { reports, totalPages } = await listPhiMonthlyAttendanceReports(prisma, appUser, { page, pageSize: 24 });
  const pending = reports.filter((report) => report.status === "SUBMITTED" || report.status === "RESUBMITTED").length;

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          eyebrow="Step 2 · Deputy Registrar"
          title="PHI attendance reports"
          description={`The PHI sends the monthly attendance (half days and absences of the contractor's staff) to the Deputy Registrar. ${pending ? `${pending} report(s) waiting for your review.` : "Nothing is waiting for review."}`}
        />
        {reports.length ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Month</th>
                  <th className="th">PHI</th>
                  <th className="th">Status</th>
                  <th className="th text-right">Deduction for absence</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="td whitespace-nowrap font-medium text-slate-900">{periodLabel({ year: report.year, month: report.month })}</td>
                    <td className="td">{report.phiUser.name}</td>
                    <td className="td">
                      <PhiStatusBadge status={report.status} />
                    </td>
                    <td className="td text-right">
                      <Money cents={toCents(report.grandTotal)} dash={false} />
                    </td>
                    <td className="td text-right">
                      <Link href={`/dr/phi-attendance/${report.id}`} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {report.status === "SUBMITTED" || report.status === "RESUBMITTED" ? "Review" : "Open"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <EmptyState>No PHI attendance reports have been received yet.</EmptyState>
        )}
        {totalPages > 1 ? (
          <div className="flex gap-2 text-sm">
            {page > 1 ? <Link href={`/dr/phi-attendance?page=${page - 1}`} className="font-semibold text-cyan-700">← Newer</Link> : null}
            {page < totalPages ? <Link href={`/dr/phi-attendance?page=${page + 1}`} className="font-semibold text-cyan-700">Older →</Link> : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
