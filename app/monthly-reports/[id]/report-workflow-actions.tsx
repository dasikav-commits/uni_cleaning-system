"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResubmitReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resubmit() {
    if (
      !window.confirm(
        "Resubmit the corrected report? The summaries will be rebuilt from the current daily records and sent back to Administration for review.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/monthly-reports/${reportId}/resubmit`, { method: "POST" });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(body.error ?? "Unable to resubmit the report.");
          return;
        }
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={resubmit}
        disabled={isPending}
        className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Resubmitting..." : "Resubmit corrected report"}
      </button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
