"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Deputy Registrar: approve the PHI monthly attendance, ask for a correction or reject it. */
export function PhiReviewPanel({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "CORRECTION" | "REJECT") {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/dr/phi-attendance/${reportId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, remarks }),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(json.error ?? "Unable to save the decision.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm print:hidden">
      <h2 className="text-base font-semibold text-slate-950">Deputy Registrar review</h2>
      <p className="mt-1 text-sm text-slate-700">Approve the attendance to use its total as the deduction for absence in the Attendance report and the Cleaning &amp; Janitorial Services report.</p>
      <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} className="control mt-4" placeholder="Remarks (required for a correction or rejection)" />
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => decide("APPROVE")} className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          Approve
        </button>
        <button type="button" disabled={busy || !remarks.trim()} onClick={() => decide("CORRECTION")} className="rounded-2xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">
          Ask for correction
        </button>
        <button type="button" disabled={busy || !remarks.trim()} onClick={() => decide("REJECT")} className="rounded-2xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
          Reject
        </button>
      </div>
    </section>
  );
}
