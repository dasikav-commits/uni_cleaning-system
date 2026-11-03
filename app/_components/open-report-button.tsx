"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Opens the report of a location for a month, creating it from the BOQ the first time. */
export function OpenReportButton({
  locationId,
  period,
  reportId,
  label,
  disabled,
}: {
  locationId: string;
  period: string;
  reportId?: string | null;
  label?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (reportId) {
      router.push(`/evaluations/${reportId}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, period }),
      });
      const json = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !json.id) throw new Error(json.error ?? "Unable to open the report.");
      router.push(`/evaluations/${json.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open the report.");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={open}
        disabled={busy || disabled}
        className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
          reportId ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
      >
        {busy ? "Opening..." : label ?? (reportId ? "Open" : "Start report")}
      </button>
      {error ? <span className="max-w-[14rem] text-right text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
