"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Decision = "APPROVE" | "REJECT" | "CLARIFICATION";

const CONFIRM: Record<Decision, string> = {
  APPROVE: "Approve this payment recommendation? It will become available for the final report.",
  REJECT: "Reject this payment recommendation? The GAA will be notified with your remarks.",
  CLARIFICATION: "Send this recommendation back to the GAA for clarification?",
};

export function VcDecisionPanel({ recommendationId }: { recommendationId: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: Decision) {
    setError(null);
    if (decision !== "APPROVE" && !remarks.trim()) {
      setError(decision === "REJECT" ? "Enter remarks explaining the rejection." : "Describe what needs clarification.");
      return;
    }
    if (!window.confirm(CONFIRM[decision])) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/vc/payment-recommendations/${recommendationId}/decision`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision, remarks }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(body.error ?? "Unable to record the decision.");
          return;
        }
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Your decision</h2>
      <label className="mt-3 block text-sm font-medium text-slate-700" htmlFor="vc-remarks">
        Remarks (required to reject or request clarification)
      </label>
      <textarea
        id="vc-remarks"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm"
        placeholder="Add remarks for the GAA"
      />
      {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("APPROVE")}
          className="rounded-2xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("CLARIFICATION")}
          className="rounded-2xl border border-sky-400 bg-white px-5 py-2.5 text-sm font-semibold text-sky-800 disabled:opacity-60"
        >
          Request clarification
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => decide("REJECT")}
          className="rounded-2xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </section>
  );
}
