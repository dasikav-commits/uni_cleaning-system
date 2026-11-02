"use client";

import { useMemo, useState } from "react";
import { PHI_DAILY_FIELDS, PHI_DAILY_FIELD_LABELS, type PhiDailyAttendanceField } from "@/lib/phi-monthly-attendance-categories";

type Counts = Record<PhiDailyAttendanceField, number>;
type Row = { date: string; counts: Counts; remark: string | null };
type Draft = { counts: Record<PhiDailyAttendanceField, string>; remark: string };

function toDraft(row?: Row): Draft {
  return {
    counts: Object.fromEntries(PHI_DAILY_FIELDS.map((field) => [field, row ? String(row.counts[field] || "") : ""])) as Draft["counts"],
    remark: row?.remark ?? "",
  };
}

function sameDraft(a: Draft, b: Draft) {
  return a.remark.trim() === b.remark.trim() && PHI_DAILY_FIELDS.every((field) => (Number(a.counts[field]) || 0) === (Number(b.counts[field]) || 0));
}

export function DailyAttendanceGrid({ period, today, locked, initialRows }: { period: string; today: string; locked: boolean; initialRows: Row[] }) {
  const [year, month] = period.split("-").map(Number);
  const days = useMemo(() => {
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: count }, (_, index) => `${period}-${String(index + 1).padStart(2, "0")}`);
  }, [period, year, month]);

  const [saved, setSaved] = useState<Record<string, Draft>>(() => Object.fromEntries(initialRows.map((row) => [row.date, toDraft(row)])));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(initialRows.map((row) => [row.date, toDraft(row)])));
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    const result = Object.fromEntries(PHI_DAILY_FIELDS.map((field) => [field, 0])) as Counts;
    for (const draft of Object.values(saved)) for (const field of PHI_DAILY_FIELDS) result[field] += Number(draft.counts[field]) || 0;
    return result;
  }, [saved]);

  function update(date: string, change: (draft: Draft) => Draft) {
    setDrafts((current) => ({ ...current, [date]: change(current[date] ?? toDraft()) }));
  }

  async function save(date: string) {
    const draft = drafts[date] ?? toDraft();
    setSaving(date);
    setErrors((current) => ({ ...current, [date]: "" }));
    const response = await fetch("/api/phi/daily-attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, counts: Object.fromEntries(PHI_DAILY_FIELDS.map((field) => [field, Number(draft.counts[field]) || 0])), remark: draft.remark }),
    });
    const json = (await response.json().catch(() => ({}))) as { row?: Row; error?: string };
    setSaving(null);
    if (!response.ok || !json.row) {
      setErrors((current) => ({ ...current, [date]: json.error ?? "Unable to save." }));
      return;
    }
    const next = toDraft(json.row);
    setSaved((current) => ({ ...current, [date]: next }));
    setDrafts((current) => ({ ...current, [date]: next }));
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {locked ? (
        <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          The monthly attendance of this month has been sent to the Deputy Registrar, so the daily sheet is locked.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Date</th>
              {PHI_DAILY_FIELDS.map((field) => (
                <th key={field} className="th min-w-[6.5rem] whitespace-normal text-center">
                  {PHI_DAILY_FIELD_LABELS[field]}
                </th>
              ))}
              <th className="th">Remark</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map((date) => {
              const future = date > today;
              const draft = drafts[date] ?? toDraft();
              const savedDraft = saved[date];
              const dirty = !sameDraft(draft, savedDraft ?? toDraft());
              const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
              const disabled = locked || future || saving === date;
              return (
                <tr key={date} className={future ? "bg-slate-50 text-slate-400" : savedDraft ? "bg-emerald-50/40" : ""}>
                  <td className="td whitespace-nowrap font-medium">
                    {date.slice(8)} <span className="text-xs text-slate-500">{weekday}</span>
                  </td>
                  {PHI_DAILY_FIELDS.map((field) => (
                    <td key={field} className="td text-center">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={draft.counts[field]}
                        disabled={disabled}
                        onChange={(event) => update(date, (current) => ({ ...current, counts: { ...current.counts, [field]: event.target.value } }))}
                        className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center tabular-nums disabled:bg-transparent disabled:text-slate-400"
                        aria-label={`${PHI_DAILY_FIELD_LABELS[field]} on ${date}`}
                      />
                    </td>
                  ))}
                  <td className="td">
                    <input
                      value={draft.remark}
                      maxLength={300}
                      disabled={disabled}
                      onChange={(event) => update(date, (current) => ({ ...current, remark: event.target.value }))}
                      className="w-44 rounded-lg border border-slate-300 px-2 py-1 disabled:bg-transparent"
                      aria-label={`Remark on ${date}`}
                    />
                  </td>
                  <td className="td whitespace-nowrap text-right">
                    {!future && !locked ? (
                      <button
                        type="button"
                        disabled={saving === date || (!dirty && Boolean(savedDraft))}
                        onClick={() => void save(date)}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                      >
                        {saving === date ? "Saving..." : savedDraft ? (dirty ? "Save" : "Saved") : "Save"}
                      </button>
                    ) : null}
                    {errors[date] ? <p className="mt-1 max-w-[12rem] whitespace-normal text-xs text-red-700">{errors[date]}</p> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="td">Total (saved)</td>
              {PHI_DAILY_FIELDS.map((field) => (
                <td key={field} className="td text-center tabular-nums">
                  {totals[field]}
                </td>
              ))}
              <td className="td" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
