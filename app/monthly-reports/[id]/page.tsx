import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { getAuthContext } from "@/lib/auth";
import { getMonthlyReport } from "@/lib/monthly-reports";
import { prisma } from "@/lib/prisma";
import { PrintReportButton } from "@/app/monthly-reports/[id]/print-report-button";
import { ResubmitReportButton } from "@/app/monthly-reports/[id]/report-workflow-actions";
import { canResubmitCorrectedReport } from "@/lib/monthly-report-corrections";

const roles = ["GAA", "ADMINISTRATION_OFFICER", "EVALUATING_OFFICER", "PHI", "VICE_CHANCELLOR"] as const;
function dateLabel(year: number, month: number) { return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1))); }
function formatDate(date: Date | null) { return date ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(date) : "-"; }
function resultLabel(result: string) { return result === "P" ? "Passed" : result === "X" ? "Failed" : "Not Applicable"; }

export default async function MonthlyReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { sessionUser, appUser } = await getAuthContext();
  if (!sessionUser) redirect("/login");
  if (!appUser || !roles.includes(appUser.role as (typeof roles)[number])) return <main className="p-8">You do not have permission to view this report.</main>;
  const { id } = await params;
  const data = await getMonthlyReport(prisma, { userId: appUser.id, role: appUser.role }, id);
  if (!data) notFound();
  const { report, evaluations, attendance } = data;
  const evaluationCount = evaluations.length;
  const needsCorrection = report.status === "CORRECTION_REQUESTED";
  const incompleteDraft = report.status === "DRAFT";
  const canResubmit = needsCorrection && (await canResubmitCorrectedReport(prisma, appUser, report.location.id));
  // Only assigned officers/PHIs reach this page for their own locations (see getMonthlyReport).
  const canEditDailyRecords = (needsCorrection || incompleteDraft) && (appUser.role === "EVALUATING_OFFICER" || appUser.role === "PHI");
  const firstDayOfMonth = `${report.year}-${String(report.month).padStart(2, "0")}-01`;
  const latestCorrection = report.administrationReviews.find((review) => review.decision === "CORRECTION");
  return <AppShell user={appUser}>
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 print-report">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/monthly-reports" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">&larr; Back to Monthly Reports</Link><PrintReportButton /></div>
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">University Cleaning Monitoring System</p><div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Monthly Evaluation Report</h1><p className="mt-2 text-lg text-slate-600">{dateLabel(report.year, report.month)}</p></div><span className="inline-flex w-fit rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800">{report.status}</span></div><dl className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt><dd className="mt-1 font-medium text-slate-900">{report.location.name} <span className="text-slate-500">({report.location.code})</span></dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generated</dt><dd className="mt-1 text-slate-700">{formatDate(report.generatedAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt><dd className="mt-1 text-slate-700">{formatDate(report.submittedAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Report completeness</dt><dd className="mt-1 text-slate-700">{report.isComplete ? "Complete" : "Incomplete"}</dd></div></dl></header>
      {needsCorrection || incompleteDraft ? (
        <section className={`rounded-3xl border p-6 shadow-sm print:hidden ${needsCorrection ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"}`}>
          <h2 className="text-lg font-semibold text-slate-950">{needsCorrection ? "Correction requested by Administration" : "Report incomplete"}</h2>
          {needsCorrection ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{latestCorrection?.remarks ?? "No remarks were provided."}{latestCorrection ? <span className="block pt-1 text-xs text-slate-500">{latestCorrection.reviewer.name} · {formatDate(latestCorrection.reviewedAt)}</span> : null}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-800">{report.processingError ?? "Some daily records are missing."} Assigned officers can fill in the missing days; a GAA then re-runs monthly processing for this month to submit the report.</p>
          )}
          {needsCorrection ? <p className="mt-2 text-sm text-slate-700">Assigned Evaluating Officers and PHIs can now correct this month&apos;s daily records. Afterwards, an assigned Evaluating Officer or a GAA resubmits the report.</p> : null}
          <div className="mt-4 flex flex-wrap items-start gap-3">
            {canEditDailyRecords ? <Link href={`/daily-monitoring?locationId=${report.location.id}&date=${firstDayOfMonth}`} className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">{needsCorrection ? "Correct daily records" : "Fill in missing records"}</Link> : null}
            {canResubmit ? <ResubmitReportButton reportId={report.id} /> : null}
          </div>
        </section>
      ) : null}
      {report.administrationReviews.length ? (
        <ReportSection title="Administration Reviews"><ul className="space-y-3">{report.administrationReviews.map((review) => <li key={review.id} className="border-l-2 border-cyan-600 pl-4 text-sm text-slate-700"><p className="font-semibold text-slate-900">{review.decision === "APPROVE" ? "Approved" : review.decision === "CORRECTION" ? "Correction requested" : "Rejected"} <span className="font-normal text-slate-500">· {review.reviewer.name} · {formatDate(review.reviewedAt)}</span></p>{review.remarks ? <p className="mt-1 whitespace-pre-wrap">{review.remarks}</p> : null}</li>)}</ul></ReportSection>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-3"><Summary label="Cleaning Tasks" value={String(report.taskSummaries.length)} /><Summary label="Evaluations" value={String(evaluationCount)} /><Summary label="PHI Attendance Records" value={String(attendance.length)} /></section>
      <ReportSection title="Cleaning Task Summary"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{["Task", "Frequency", "P", "X", "NA", "Applicable", "Completion"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{report.taskSummaries.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No task summary records available.</td></tr> : report.taskSummaries.map((task) => <tr key={task.id}><td className="px-4 py-4 text-sm font-medium text-slate-900">{task.taskNameSnapshot}</td><td className="px-4 py-4 text-sm text-slate-600">{task.frequencySnapshot}</td><td className="px-4 py-4 text-sm text-slate-600">{task.passedOccurrences}</td><td className="px-4 py-4 text-sm text-slate-600">{task.failedOccurrences}</td><td className="px-4 py-4 text-sm text-slate-600">{task.notApplicableOccurrences}</td><td className="px-4 py-4 text-sm text-slate-600">{task.applicableOccurrences}</td><td className="px-4 py-4 text-sm font-semibold text-slate-900">{String(task.completionPercentage)}%</td></tr>)}</tbody></table></div></ReportSection>
      <ReportSection title="Evaluation History"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{["Date", "Task", "Result", "Evaluating Officer", "Remark"].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{evaluations.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">No evaluation records available.</td></tr> : evaluations.map((evaluation) => <tr key={evaluation.id}><td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{evaluation.evaluationDate}</td><td className="px-4 py-4 text-sm text-slate-900">{evaluation.locationTask.task.name}</td><td className="px-4 py-4"><span className="font-semibold text-slate-900">{evaluation.result}</span><span className="ml-2 text-sm text-slate-500">{resultLabel(evaluation.result)}</span></td><td className="px-4 py-4 text-sm text-slate-600">{evaluation.evaluatingOfficer.name}</td><td className="max-w-sm px-4 py-4 text-sm text-slate-600">{evaluation.remark ?? "-"}</td></tr>)}</tbody></table></div></ReportSection>
      <ReportSection title="Remarks"><div className="space-y-3">{evaluations.filter((evaluation) => evaluation.remark).length === 0 ? <p className="text-sm text-slate-500">No remarks recorded.</p> : evaluations.filter((evaluation) => evaluation.remark).map((evaluation) => <div key={evaluation.id} className="border-l-2 border-cyan-600 pl-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{evaluation.evaluationDate}</p><p className="mt-1 text-sm text-slate-700">{evaluation.remark}</p></div>)}</div></ReportSection>
      <ReportSection title="PHI Attendance"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total Present Count</th><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Remark</th></tr></thead><tbody className="divide-y divide-slate-200">{attendance.length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">No attendance records available.</td></tr> : attendance.map((entry) => <tr key={entry.id}><td className="px-4 py-4 text-sm text-slate-600">{entry.attendanceDate}</td><td className="px-4 py-4 text-sm font-semibold text-slate-900">{entry.totalPresentCount}</td><td className="px-4 py-4 text-sm text-slate-600">{entry.remark ?? "-"}</td></tr>)}</tbody></table></div></ReportSection>
      <ReportSection title="Report Information"><dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-1 text-sm text-slate-700">{report.status}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generated</dt><dd className="mt-1 text-sm text-slate-700">{formatDate(report.generatedAt)}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt><dd className="mt-1 text-sm text-slate-700">{formatDate(report.submittedAt)}</dd></div>{report.resubmittedAt ? <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resubmitted</dt><dd className="mt-1 text-sm text-slate-700">{formatDate(report.resubmittedAt)}</dd></div> : null}</dl></ReportSection>
    </div>
  </AppShell>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div>; }
function ReportSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 text-lg font-semibold text-slate-950">{title}</h2>{children}</section>; }
