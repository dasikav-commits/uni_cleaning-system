import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { PrintButton } from "@/app/_components/print-button";
import { EvaluationStatusBadge, Money, PageHeader } from "@/app/_components/ui";
import { formatPercent, frequencyLabels } from "@/lib/evaluation-calc";
import { getWorkDoneReport } from "@/lib/monthly-process";
import { requirePageUser } from "@/lib/page-auth";
import { periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";

export default async function WorkDonePage({ searchParams }: PageProps<"/dr/reports/work-done">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const period = periodFromSearchParam(params.period);
  const view = await getWorkDoneReport(prisma, period);
  const key = periodKey(period);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 print-report">
        <PageHeader
          eyebrow="Step 4 · Deputy Registrar"
          title={`Amount of work done - ${periodLabel(period)}`}
          description={
            <>
              Kuliyapitiya Premises. Created from the evaluation reports: {view.acceptedCount} of {view.totalCount} locations accepted. Locations that are not accepted yet are shown with
              their current figures and are not counted in the total. Approved amount of accepted locations: <strong>Rs. <Money cents={view.approvedCents} dash={false} /></strong>.
            </>
          }
          actions={
            <>
              <PeriodPicker period={period} />
              <a href={`/api/dr/reports/work-done?period=${key}`} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Download Excel
              </a>
              <PrintButton />
            </>
          }
        />

        {view.sections.map((section) => (
          <section key={section.locationId} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" style={{ breakInside: "avoid" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h2 className="font-semibold text-slate-950">
                {section.boqNumber ? `${section.boqNumber}. ` : ""}
                {section.name}
              </h2>
              <div className="flex items-center gap-2">
                <EvaluationStatusBadge status={section.status} />
                {section.reportId ? (
                  <Link href={`/evaluations/${section.reportId}`} className="text-xs font-semibold text-cyan-700 print:hidden">
                    Open report
                  </Link>
                ) : null}
              </div>
            </div>
            {section.rows.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead>
                    <tr>
                      <th className="th">Item</th>
                      <th className="th">Description</th>
                      <th className="th">Frequency</th>
                      <th className="th text-right">Amount</th>
                      <th className="th text-right">%</th>
                      <th className="th text-right">Deduction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {section.rows.map((row) => (
                      <tr key={row.id} className={row.state === "deducted" ? "bg-red-50/60" : ""}>
                        <td className="td whitespace-nowrap">
                          {row.itemNo}
                          {row.subItem ? ` ${row.subItem}` : ""}
                        </td>
                        <td className="td">
                          {row.description}
                          {section.evaluationFormat === "RATE_BASED" && row.filled ? (
                            <span className="text-slate-500">
                              {" "}
                              ({row.quantity ?? 0} {row.unitLabel ?? "unit"}
                              {(row.quantity ?? 0) === 1 ? "" : "s"}
                              {row.penaltyQuantity ? `, ${row.penaltyQuantity} fined` : ""})
                            </span>
                          ) : null}
                          {row.remark ? <span className="block text-xs italic text-slate-500">{row.remark}</span> : null}
                        </td>
                        <td className="td whitespace-nowrap">{frequencyLabels[row.frequency]}</td>
                        <td className="td whitespace-nowrap text-right">
                          <Money cents={section.evaluationFormat === "RATE_BASED" ? row.totalCents + row.deductionCents : row.amountCents} />
                        </td>
                        <td className="td text-right">{row.filled ? formatPercent(row.deductionPercent) : <span className="text-xs text-amber-700">not filled</span>}</td>
                        <td className="td whitespace-nowrap text-right text-red-700">
                          <Money cents={row.deductionCents} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold">
                    <tr>
                      <td className="td" colSpan={3}>
                        Approved amount {section.status !== "ACCEPTED" ? "(not accepted yet)" : ""}
                      </td>
                      <td className="td text-right">
                        <Money cents={section.boqCents} />
                      </td>
                      <td className="td" />
                      <td className="td text-right text-slate-950">
                        <Money cents={section.status === "ACCEPTED" ? section.approvedCents : section.draftApprovedCents} dash={false} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-500">No report has been started for this location.</p>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
