"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = {
  period: string;
  locationsProcessed: number;
  reportsCreated: number;
  reportsAlreadyExist: number;
  reportsIncomplete: number;
  errors: Array<{ location: string; message: string }>;
};

const MONTHS = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 1))),
);

/**
 * GAA control for (re-)running monthly processing. Re-running a month turns
 * incomplete drafts whose missing records were filled in into submitted reports;
 * reports already sent to Administration are left untouched.
 */
export function RunMonthlyProcessing({ defaultMonth, defaultYear }: { defaultMonth: number; defaultYear: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const years = Array.from({ length: 4 }, (_, index) => defaultYear - index);

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/monthly-processing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ month, year }),
        });
        const body = (await response.json().catch(() => ({}))) as Result & { error?: string };
        if (!response.ok) {
          setError(body.error ?? "Unable to run monthly processing.");
          return;
        }
        setResult(body);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Monthly processing</h2>
      <p className="mt-1 text-sm text-slate-600">
        Generate the reports for a closed month. Run it again after missing daily records have been filled in to submit incomplete reports.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Month</span>
          <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
            {MONTHS.map((label, index) => (
              <option key={label} value={index + 1}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</span>
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
            {years.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={run} disabled={isPending} className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Processing..." : "Run monthly processing"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
      {result ? (
        <div className="mt-3 text-sm text-slate-700">
          <p>
            {result.period}: {result.locationsProcessed} location(s) processed · {result.reportsCreated} submitted · {result.reportsIncomplete} incomplete · {result.reportsAlreadyExist} already submitted.
          </p>
          {result.errors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
              {result.errors.map((item) => (
                <li key={`${item.location}:${item.message}`}><strong>{item.location}:</strong> {item.message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
