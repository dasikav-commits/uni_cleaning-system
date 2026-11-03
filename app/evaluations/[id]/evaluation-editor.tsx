"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { EvaluationReportView } from "@/lib/evaluation-reports";
import {
  calculateRateRow,
  calculateScheduledRow,
  formatMoney,
  formatPercent,
  frequencyLabels,
  occurrencesFor,
  type Occurrence,
} from "@/lib/evaluation-calc";
import { periodLabel } from "@/lib/periods";

type Row = EvaluationReportView["rows"][number];

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "Something went wrong.");
  return json;
}

const rowTone = {
  blank: "bg-white",
  complete: "bg-emerald-50",
  deducted: "bg-red-50",
} as const;

const stateLabel = {
  blank: { text: "Fill in", className: "border-slate-300 bg-white text-slate-700" },
  complete: { text: "Complete", className: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  deducted: { text: "Deducted", className: "border-red-300 bg-red-100 text-red-700" },
} as const;

export function EvaluationEditor({ initial, isDr }: { initial: EvaluationReportView; isDr: boolean }) {
  const router = useRouter();
  const [report, setReport] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [remarks, setRemarks] = useState(initial.remarks ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rateBased = report.location.evaluationFormat === "RATE_BASED";
  const allFilled = report.filledCount === report.rows.length;
  const period = report.period;

  function applyRow(result: { row: Row; deductionCents: number; approvedCents: number; boqCents: number; filledCount: number }) {
    setReport((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === result.row.id ? { ...row, ...result.row } : row)),
      deductionCents: result.deductionCents,
      approvedCents: result.approvedCents,
      filledCount: result.filledCount,
    }));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 print-report">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Evaluation cleaning report for cleaning services</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
              {report.location.boqNumber ? `${report.location.boqNumber}. ` : ""}
              {report.location.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {periodLabel(period)} · Kuliyapitiya premises · {rateBased ? "Rate based (per service)" : "Tick format"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Started by {report.createdBy}
              {report.submittedBy ? ` · sent by ${report.submittedBy}` : ""}
              {report.reviewedBy ? ` · reviewed by ${report.reviewedBy}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <StatusPill status={report.status} />
            <button type="button" onClick={() => window.print()} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Print
            </button>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-4">
          <Stat label="Amount as per BOQ" value={formatMoney(report.boqCents, { dashForZero: false })} />
          <Stat label="Deduction" value={formatMoney(report.deductionCents, { dashForZero: false })} tone={report.deductionCents > 0 ? "red" : undefined} />
          <Stat label="Approved amount" value={formatMoney(report.approvedCents, { dashForZero: false })} tone="emerald" />
          <Stat label="Rows filled" value={`${report.filledCount} of ${report.rows.length}`} tone={allFilled ? "emerald" : "amber"} />
        </dl>
      </header>

      {report.status === "RETURNED" && report.returnReason ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-semibold">Returned by the Deputy Registrar for correction</p>
          <p className="mt-1 whitespace-pre-line">{report.returnReason}</p>
        </div>
      ) : null}

      {report.boqChanged ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p>The BOQ of this location was changed after this report was started (amounts, rates or items). Update the report to use the current BOQ - ticks already made are kept.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await send(`/api/evaluations/${report.id}/sync`, "POST");
                router.refresh();
                const fresh = await send(`/api/evaluations/${report.id}`, "GET");
                setReport(fresh.report as EvaluationReportView);
              })
            }
            className="shrink-0 rounded-2xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Update from BOQ
          </button>
        </div>
      ) : null}

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Amount of work done</h2>
          <p className="text-xs text-slate-500 print:hidden">
            {report.canEdit ? "Click a row to fill it in. " : ""}
            <span className="mr-2 inline-block h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-100 align-middle" /> complete
            <span className="ml-3 mr-2 inline-block h-3 w-3 rounded-sm border border-red-300 bg-red-100 align-middle" /> deducted
            <span className="ml-3 mr-2 inline-block h-3 w-3 rounded-sm border border-slate-300 bg-white align-middle" /> not filled
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Item</th>
                <th className="th">Description</th>
                <th className="th">Frequency</th>
                {rateBased ? (
                  <>
                    <th className="th text-right">Rate</th>
                    <th className="th text-right">Done</th>
                    <th className="th text-right">Fine</th>
                  </>
                ) : (
                  <>
                    <th className="th text-right">Amount</th>
                    <th className="th text-right">Done</th>
                    <th className="th text-right">%</th>
                  </>
                )}
                <th className="th text-right">Deduction</th>
                <th className="th text-right">Total</th>
                <th className="th print:hidden" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => {
                const state = stateLabel[row.state];
                return (
                  <tr
                    key={row.id}
                    className={`${rowTone[row.state]} ${report.canEdit ? "cursor-pointer hover:brightness-95" : ""}`}
                    onClick={report.canEdit ? () => setEditing(row) : undefined}
                  >
                    <td className="td whitespace-nowrap font-medium text-slate-900">
                      {row.itemNo}
                      {row.subItem ? ` ${row.subItem}` : ""}
                    </td>
                    <td className="td min-w-[18rem]">
                      <p className="text-slate-800">{row.description}</p>
                      {"details" in row && row.details ? <p className="mt-1 text-xs text-slate-500">{row.details}</p> : null}
                      {row.remark ? <p className="mt-1 text-xs italic text-slate-500">Remark: {row.remark}</p> : null}
                    </td>
                    <td className="td whitespace-nowrap">{frequencyLabels[row.frequency]}</td>
                    {rateBased ? (
                      <>
                        <td className="td whitespace-nowrap text-right tabular-nums">
                          {row.unitRateCents === null ? <span className="text-xs font-semibold text-amber-700">Rate not set</span> : formatMoney(row.unitRateCents)}
                        </td>
                        <td className="td text-right tabular-nums">{row.filled ? row.quantity ?? 0 : ""}</td>
                        <td className="td text-right tabular-nums">{row.filled && row.penaltyQuantity ? row.penaltyQuantity : ""}</td>
                      </>
                    ) : (
                      <>
                        <td className="td whitespace-nowrap text-right tabular-nums">{formatMoney(row.amountCents)}</td>
                        <td className="td whitespace-nowrap text-right tabular-nums">{row.filled ? `${row.completedCount}/${row.scheduledCount}` : ""}</td>
                        <td className="td text-right tabular-nums">{row.filled ? formatPercent(row.deductionPercent) : ""}</td>
                      </>
                    )}
                    <td className="td whitespace-nowrap text-right tabular-nums text-red-700">{row.filled ? formatMoney(row.deductionCents) : ""}</td>
                    <td className="td whitespace-nowrap text-right font-semibold tabular-nums text-slate-900">{row.filled || !rateBased ? formatMoney(row.totalCents) : ""}</td>
                    <td className="td print:hidden">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${state.className}`}>
                        {report.canEdit && row.state !== "blank" ? "Edit" : state.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-900">
              <tr>
                <td className="td" colSpan={rateBased ? 6 : 3}>
                  Total
                </td>
                {rateBased ? null : (
                  <>
                    <td className="td text-right tabular-nums">{formatMoney(report.rows.reduce((sum, row) => sum + row.amountCents, 0))}</td>
                    <td className="td" />
                    <td className="td" />
                  </>
                )}
                <td className="td text-right tabular-nums text-red-700">{formatMoney(report.deductionCents)}</td>
                <td className="td text-right tabular-nums">{formatMoney(report.approvedCents, { dashForZero: false })}</td>
                <td className="td print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {report.canEdit ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:hidden">
          <h2 className="text-base font-semibold text-slate-950">Send to the Deputy Registrar</h2>
          <p className="mt-1 text-sm text-slate-600">
            {allFilled
              ? "Every row is filled in. Add a remark if needed and send the report."
              : `Fill in the remaining ${report.rows.length - report.filledCount} row(s) first - every row must be complete before the report can be sent.`}
          </p>
          <textarea
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Remarks (optional)"
            className="control mt-4"
          />
          <button
            type="button"
            disabled={busy || !allFilled}
            onClick={() =>
              run(async () => {
                await send(`/api/evaluations/${report.id}/submit`, "POST", { remarks });
                setReport((current) => ({ ...current, status: "SUBMITTED", canEdit: false, editable: false, canReview: isDr }));
                setNotice("The report has been sent to the Deputy Registrar.");
                router.refresh();
              })
            }
            className="mt-4 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {report.status === "RETURNED" ? "Send corrected report" : "Send report"}
          </button>
        </section>
      ) : report.remarks ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-900">Remarks</p>
          <p className="mt-1 whitespace-pre-line">{report.remarks}</p>
        </section>
      ) : null}

      {report.canReview || report.canReopen ? (
        <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm print:hidden">
          <h2 className="text-base font-semibold text-slate-950">Deputy Registrar review</h2>
          <p className="mt-1 text-sm text-slate-700">
            {report.canReview
              ? "Accept the report to use its approved amount in the Amount of work done and the Cleaning & Janitorial Services report, or return it with the corrections needed."
              : "This report is accepted. Reopen it to send it back for correction (only while the payment report of the month is not finalized)."}
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What has to be corrected (required to return)"
            className="control mt-4"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            {report.canReview ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await send(`/api/evaluations/${report.id}/review`, "POST", { decision: "ACCEPT" });
                    setReport((current) => ({ ...current, status: "ACCEPTED", canReview: false, canReopen: true }));
                    setNotice("Report accepted.");
                    router.refresh();
                  })
                }
                className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Accept report
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy || !reason.trim()}
              onClick={() =>
                run(async () => {
                  await send(`/api/evaluations/${report.id}/review`, "POST", { decision: "RETURN", reason });
                  setReport((current) => ({ ...current, status: "RETURNED", returnReason: reason, canReview: false, canReopen: false, canEdit: true, editable: true }));
                  setReason("");
                  setNotice("Report returned for correction. The sender has been notified.");
                  router.refresh();
                })
              }
              className="rounded-2xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {report.canReview ? "Return for correction" : "Reopen and return"}
            </button>
          </div>
        </section>
      ) : null}

      {editing ? (
        <RowDialog
          key={editing.id}
          row={editing}
          rateBased={rateBased}
          period={period}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const result = (await send(`/api/evaluations/${report.id}/rows/${editing.id}`, "PATCH", body)) as unknown as Parameters<typeof applyRow>[0];
            applyRow(result);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" | "emerald" | "amber" }) {
  const color = tone === "red" ? "text-red-700" : tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-slate-950";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta: Record<string, string> = {
    DRAFT: "border-amber-200 bg-amber-50 text-amber-800",
    SUBMITTED: "border-cyan-200 bg-cyan-50 text-cyan-800",
    RETURNED: "border-red-200 bg-red-50 text-red-700",
    ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  const label: Record<string, string> = { DRAFT: "Draft", SUBMITTED: "Sent to DR", RETURNED: "Returned for correction", ACCEPTED: "Accepted by DR" };
  return <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${meta[status] ?? ""}`}>{label[status] ?? status}</span>;
}

// ---------------------------------------------------------------------------
// Pop-up: tick the work done (or enter quantities)
// ---------------------------------------------------------------------------

type SaveBody = { completedKeys?: string[]; quantity?: number; penaltyQuantity?: number; remark?: string; reset?: boolean };

function RowDialog({
  row,
  rateBased,
  period,
  onClose,
  onSave,
}: {
  row: Row;
  rateBased: boolean;
  period: { year: number; month: number };
  onClose: () => void;
  onSave: (body: SaveBody) => Promise<void>;
}) {
  const occurrences = useMemo(() => occurrencesFor(row.frequency, period), [row.frequency, period]);
  // A blank row opens with everything ticked ("Sum of 100%"); untick what was not done.
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(row.filled ? row.completedKeys : occurrences.map((occurrence) => occurrence.key)));
  const [quantity, setQuantity] = useState(String(row.quantity ?? 0));
  const [penaltyQuantity, setPenaltyQuantity] = useState(String(row.penaltyQuantity ?? 0));
  const [remark, setRemark] = useState(row.remark ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = rateBased
    ? (() => {
        const result = calculateRateRow(row.unitRateCents, Number(quantity) || 0, row.penaltyRateCents, Number(penaltyQuantity) || 0);
        return { deductionCents: result.penaltyCents, totalCents: result.totalCents, percent: null as number | null };
      })()
    : (() => {
        const result = calculateScheduledRow(row.amountCents, row.frequency, period, [...ticked]);
        return { deductionCents: result.deductionCents, totalCents: result.totalCents, percent: result.deductionPercent };
      })();

  function toggle(key: string) {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save(body: SaveBody) {
    setSaving(true);
    setError(null);
    try {
      await onSave(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6 print:hidden" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Item {row.itemNo}
              {row.subItem ? ` ${row.subItem}` : ""} · {frequencyLabels[row.frequency]}
            </p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">{row.description}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">
            Close
          </button>
        </div>

        {rateBased ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{row.unitLabel === "service" ? "Services done this month" : `Number of ${row.unitLabel ?? "unit"}s removed this month`}</span>
              <input type="number" min={0} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} className="control" />
              <span className="mt-1 block text-xs text-slate-500">
                Rate: {row.unitRateCents === null ? "not set in the BOQ" : `Rs. ${formatMoney(row.unitRateCents)} per ${row.unitLabel ?? "unit"}`}
              </span>
            </label>
            {row.penaltyRateCents !== null ? (
              <label className="block">
                <span className="label">Not removed as instructed (fined)</span>
                <input type="number" min={0} step={1} value={penaltyQuantity} onChange={(event) => setPenaltyQuantity(event.target.value)} className="control" />
                <span className="mt-1 block text-xs text-slate-500">Fine: Rs. {formatMoney(row.penaltyRateCents)} each</span>
              </label>
            ) : null}
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setTicked(new Set(occurrences.map((occurrence) => occurrence.key)))} className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                Tick all (100%)
              </button>
              <button type="button" onClick={() => setTicked(new Set())} className="rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                Untick all
              </button>
              <span className="text-xs text-slate-500">
                {ticked.size} of {occurrences.length} done
              </span>
            </div>
            <OccurrenceGrid frequency={row.frequency} occurrences={occurrences} ticked={ticked} onToggle={toggle} />
          </div>
        )}

        <label className="mt-5 block">
          <span className="label">Remark (optional)</span>
          <input value={remark} onChange={(event) => setRemark(event.target.value)} maxLength={500} className="control" placeholder="e.g. toilets on the 2nd floor not cleaned" />
        </label>

        <div className={`mt-5 grid gap-3 rounded-2xl border p-4 sm:grid-cols-3 ${preview.deductionCents > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">{rateBased ? "Amount" : "Deduction %"}</p>
            <p className="text-lg font-semibold tabular-nums">{rateBased ? formatMoney(preview.totalCents + preview.deductionCents, { dashForZero: false }) : formatPercent(preview.percent) || "0%"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">{rateBased ? "Fine" : "Deduction"}</p>
            <p className="text-lg font-semibold tabular-nums text-red-700">{formatMoney(preview.deductionCents, { dashForZero: false })}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(preview.totalCents, { dashForZero: false })}</p>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            disabled={saving || !row.filled}
            onClick={() => save({ reset: true })}
            className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Clear row
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              save(
                rateBased
                  ? { quantity: Number(quantity) || 0, penaltyQuantity: Number(penaltyQuantity) || 0, remark }
                  : { completedKeys: [...ticked], remark },
              )
            }
            className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save row"}
          </button>
        </div>
      </div>
    </div>
  );
}

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Tick({ on, label, sub, onClick }: { on: boolean; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-1 text-xs font-semibold transition ${
        on ? "border-emerald-400 bg-emerald-500 text-white" : "border-red-300 bg-red-50 text-red-700"
      }`}
    >
      <span>{label}</span>
      {sub ? <span className="text-[10px] font-medium opacity-80">{sub}</span> : null}
    </button>
  );
}

function OccurrenceGrid({
  frequency,
  occurrences,
  ticked,
  onToggle,
}: {
  frequency: Row["frequency"];
  occurrences: Occurrence[];
  ticked: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (frequency === "DAILY" || frequency === "TWICE_DAILY") {
    const days = [...new Map(occurrences.map((occurrence) => [occurrence.day, occurrence])).values()];
    const offset = WEEKDAY_ORDER.indexOf(days[0]?.weekday ?? "Mon");
    return (
      <div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase text-slate-400">
          {WEEKDAY_ORDER.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {Array.from({ length: offset }, (_, index) => (
            <span key={`pad-${index}`} />
          ))}
          {days.map((day) =>
            frequency === "DAILY" ? (
              <Tick key={day.key} on={ticked.has(day.key)} label={String(day.day)} onClick={() => onToggle(day.key)} />
            ) : (
              <div key={day.day} className="rounded-xl border border-slate-200 p-1">
                <p className="text-center text-[11px] font-semibold text-slate-600">{day.day}</p>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  {(["am", "pm"] as const).map((shift) => {
                    const key = `d${day.day}-${shift}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onToggle(key)}
                        aria-pressed={ticked.has(key)}
                        className={`rounded-md py-1 text-[10px] font-bold uppercase ${ticked.has(key) ? "bg-emerald-500 text-white" : "bg-red-100 text-red-700"}`}
                      >
                        {shift}
                      </button>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {occurrences.map((occurrence) => (
        <Tick key={occurrence.key} on={ticked.has(occurrence.key)} label={occurrence.label} sub={ticked.has(occurrence.key) ? "Done" : "Not done"} onClick={() => onToggle(occurrence.key)} />
      ))}
    </div>
  );
}
