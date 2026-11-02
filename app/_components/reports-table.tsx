import Link from "next/link";
import { locationCategoryLabels, roleLabel, type LocationCategoryKey } from "@/lib/application-roles";
import type { listReportsForPeriod } from "@/lib/evaluation-reports";
import { EmptyState, EvaluationStatusBadge, Money } from "./ui";
import { OpenReportButton } from "./open-report-button";

type Rows = Awaited<ReturnType<typeof listReportsForPeriod>>;

export function ReportsTable({ rows, period, showReporters }: { rows: Rows; period: string; showReporters?: boolean }) {
  if (!rows.length) {
    return <EmptyState>No locations to show. {showReporters ? "Import the BOQ or change the filter." : "Ask the Deputy Registrar to assign your locations to your login."}</EmptyState>;
  }

  const groups = new Map<string, Rows>();
  for (const row of rows) groups.set(row.category, [...(groups.get(row.category) ?? []), row]);

  return (
    <div className="flex flex-col gap-6">
      {[...groups.entries()].map(([category, items]) => (
        <section key={category} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
            {locationCategoryLabels[category as LocationCategoryKey] ?? category} ({items.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr>
                  <th className="th">No.</th>
                  <th className="th">Location</th>
                  {showReporters ? <th className="th">Sent by (login)</th> : null}
                  <th className="th">Status</th>
                  <th className="th text-right">Progress</th>
                  <th className="th text-right">Amount as per BOQ</th>
                  <th className="th text-right">Deduction</th>
                  <th className="th text-right">Approved</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className={row.report?.status === "ACCEPTED" ? "bg-emerald-50/50" : row.report?.status === "RETURNED" ? "bg-red-50/50" : ""}>
                    <td className="td whitespace-nowrap font-medium">{row.boqNumber ?? "-"}</td>
                    <td className="td min-w-[14rem]">
                      {row.report ? (
                        <Link href={`/evaluations/${row.report.id}`} className="font-semibold text-slate-900 hover:text-cyan-700">
                          {row.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-slate-900">{row.name}</span>
                      )}
                      <p className="text-xs text-slate-500">
                        {row.evaluationFormat === "RATE_BASED" ? "Rate based" : "Tick format"} · {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
                      </p>
                      {row.report?.status === "RETURNED" && row.report.returnReason ? <p className="mt-1 text-xs text-red-700">Returned: {row.report.returnReason}</p> : null}
                    </td>
                    {showReporters ? (
                      <td className="td text-xs">
                        {row.reporters.length ? (
                          row.reporters.map((reporter) => (
                            <span key={reporter.id} className="block">
                              {reporter.name} <span className="text-slate-400">({roleLabel(reporter.role)})</span>
                            </span>
                          ))
                        ) : (
                          <Link href="/dr/assignments" className="font-semibold text-amber-700">
                            No login assigned
                          </Link>
                        )}
                      </td>
                    ) : null}
                    <td className="td">
                      <EvaluationStatusBadge status={row.report?.status} />
                    </td>
                    <td className="td whitespace-nowrap text-right tabular-nums">{row.report ? `${row.report.filledCount}/${row.report.rowCount}` : ""}</td>
                    <td className="td whitespace-nowrap text-right">
                      <Money cents={row.report?.boqCents ?? row.boqCents} />
                    </td>
                    <td className="td whitespace-nowrap text-right text-red-700">
                      <Money cents={row.report ? row.report.deductionCents : null} />
                    </td>
                    <td className="td whitespace-nowrap text-right font-semibold text-slate-900">
                      <Money cents={row.report ? row.report.approvedCents : null} />
                    </td>
                    <td className="td text-right">
                      <OpenReportButton locationId={row.id} period={period} reportId={row.report?.id} disabled={!row.report && row.itemCount === 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
