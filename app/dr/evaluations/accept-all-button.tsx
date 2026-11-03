"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptAllButton({ period, category, count }: { period: string; category?: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!count) return null;

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm(`Accept all ${count} report(s) that were sent to you without opening them?`)) return;
          setBusy(true);
          setMessage(null);
          const response = await fetch("/api/dr/evaluations/accept-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ period, category }),
          });
          const json = (await response.json().catch(() => ({}))) as { accepted?: number; error?: string };
          setBusy(false);
          setMessage(response.ok ? `${json.accepted ?? 0} report(s) accepted.` : json.error ?? "Unable to accept the reports.");
          router.refresh();
        }}
        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Accepting..." : `Accept all sent (${count})`}
      </button>
      {message ? <span className="text-xs text-slate-600">{message}</span> : null}
    </span>
  );
}
