"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { centsToDecimalString, formatMoney, toCents } from "@/lib/evaluation-calc";
import type { PaymentReportView } from "@/lib/monthly-process";

async function send(method: string, body: unknown) {
  const response = await fetch("/api/dr/payment-report", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await response.json().catch(() => ({}))) as { report?: PaymentReportView; error?: string };
  if (!response.ok || !json.report) throw new Error(json.error ?? "Something went wrong.");
  return json.report;
}

export function PaymentReportClient({ initial, period }: { initial: PaymentReportView; period: string }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [invoices, setInvoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.lines.map((line) => [line.locationId, centsToDecimalString(line.invoiceCents)])),
  );
  const [remarks, setRemarks] = useState(initial.remarks ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const finalized = view.status === "FINALIZED";

  const invoiceTotal = finalized
    ? view.totals.invoiceCents
    : view.lines.reduce((sum, line) => sum + (Number.isFinite(toCents(invoices[line.locationId])) ? toCents(invoices[line.locationId]) : 0), 0);
  const dirty =
    !finalized &&
    (remarks !== (view.remarks ?? "") || view.lines.some((line) => toCents(invoices[line.locationId]) !== line.invoiceCents));

  async function run(action: () => Promise<PaymentReportView>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const report = await action();
      setView(report);
      setInvoices(Object.fromEntries(report.lines.map((line) => [line.locationId, centsToDecimalString(line.invoiceCents)])));
      setRemarks(report.remarks ?? "");
      setNotice(message);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {finalized ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold">Finalized{view.finalizedBy ? ` by ${view.finalizedBy}` : ""}{view.finalizedAt ? ` on ${new Date(view.finalizedAt).toLocaleString()}` : ""}.</p>
          <p className="mt-1">The figures below are frozen. Reopen the report only if an evaluation report has to be corrected.</p>
        </div>
      ) : view.blockers.length ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Not ready to finalize</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {view.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-sm text-cyan-900">All evaluation reports are accepted and the PHI attendance is approved. Check the invoice amounts, then finalize.</div>
      )}

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">No.</th>
                <th className="th">Description</th>
                <th className="th text-right">Amount as per the BOQ (Rs.)</th>
                <th className="th text-right">Amount as per the Invoice (Rs.)</th>
                <th className="th text-right">Approved Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {view.lines.map((line) => (
                <tr key={line.locationId} className={line.approvedCents === null ? "bg-amber-50/60" : ""}>
                  <td className="td whitespace-nowrap">{line.boqNumber ?? ""}</td>
                  <td className="td min-w-[18rem]">
                    {line.evaluationReportId ? (
                      <Link href={`/evaluations/${line.evaluationReportId}`} className="text-slate-800 hover:text-cyan-700">
                        {line.description}
                      </Link>
                    ) : (
                      line.description
                    )}
                  </td>
                  <td className="td whitespace-nowrap text-right tabular-nums">{formatMoney(line.boqCents)}</td>
                  <td className="td whitespace-nowrap text-right tabular-nums">
                    {finalized ? (
                      formatMoney(line.invoiceCents)
                    ) : (
                      <input
                        inputMode="decimal"
                        value={invoices[line.locationId] ?? ""}
                        onChange={(event) => setInvoices((current) => ({ ...current, [line.locationId]: event.target.value }))}
                        className="w-36 rounded-xl border border-slate-300 px-2 py-1 text-right tabular-nums print:border-0"
                        aria-label={`Invoice amount for ${line.description}`}
                      />
                    )}
                  </td>
                  <td className="td whitespace-nowrap text-right font-semibold tabular-nums text-slate-900">
                    {line.approvedCents === null ? <span className="text-xs font-semibold text-amber-700">{line.reportStatus ? line.reportStatus.toLowerCase() : "no report"}</span> : formatMoney(line.approvedCents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-950">
              <tr>
                <td className="td" />
                <td className="td">Total</td>
                <td className="td text-right tabular-nums">{formatMoney(view.totals.boqCents, { dashForZero: false })}</td>
                <td className="td text-right tabular-nums">{formatMoney(invoiceTotal, { dashForZero: false })}</td>
                <td className="td text-right tabular-nums">{formatMoney(view.totals.approvedCents, { dashForZero: false })}</td>
              </tr>
              <tr>
                <td className="td" />
                <td className="td">Less: Deduction for absence (Attendance report)</td>
                <td className="td" />
                <td className="td" />
                <td className="td text-right tabular-nums text-red-700">({formatMoney(view.totals.absenceDeductionCents, { dashForZero: false })})</td>
              </tr>
              <tr className="text-base">
                <td className="td" />
                <td className="td">Amount payable</td>
                <td className="td" />
                <td className="td" />
                <td className="td text-right tabular-nums">{formatMoney(view.totals.payableCents, { dashForZero: false })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
        {finalized ? (
          <>
            <h2 className="text-base font-semibold text-slate-950">Reopen</h2>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="control mt-3" placeholder="Why is the report being reopened? (required)" />
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={() => run(() => send("POST", { period, action: "reopen", reason }), "The report has been reopened.")}
              className="mt-3 rounded-2xl border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reopen report
            </button>
          </>
        ) : (
          <>
            <label className="block">
              <span className="label">Remarks</span>
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={2} maxLength={2000} className="control" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !dirty}
                onClick={() => run(() => send("PATCH", { period, invoices, remarks }), "Saved.")}
                className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Save invoice amounts
              </button>
              <button
                type="button"
                disabled={busy || dirty || view.blockers.length > 0}
                title={dirty ? "Save your changes first" : undefined}
                onClick={() => {
                  if (!window.confirm("Finalize the Cleaning & Janitorial Services report? The figures will be frozen.")) return;
                  void run(() => send("POST", { period, action: "finalize" }), "The report has been finalized and the Deputy Registrars have been notified.");
                }}
                className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Finalize report
              </button>
            </div>
          </>
        )}
      </section>

      <div className="hidden grid-cols-2 gap-12 pt-16 text-sm print:grid">
        <p className="border-t border-slate-400 pt-2">Prepared by</p>
        <p className="border-t border-slate-400 pt-2">Deputy Registrar</p>
      </div>
    </>
  );
}
