"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { locationCategories, locationCategoryLabels } from "@/lib/application-roles";

export async function sendJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}

export function BoqImportButton({ hasLocations }: { hasLocations: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  async function run() {
    const question = replace
      ? "Reload the BOQ items of every Kuliyapitiya location? The current items will be retired and replaced (reports that were already started keep their rows)."
      : "Load the Kuliyapitiya BOQ? Missing locations and items are created; existing ones are kept.";
    if (!window.confirm(question)) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = (await sendJson("/api/dr/boq/import", "POST", { replaceItems: replace })) as {
        locationsCreated: number;
        locationsUpdated: number;
        itemsCreated: number;
        locationsWithExistingItems: string[];
      };
      setMessage(
        `${result.locationsCreated} location(s) created, ${result.locationsUpdated} updated, ${result.itemsCreated} item(s) added.` +
          (result.locationsWithExistingItems.length ? ` ${result.locationsWithExistingItems.length} location(s) already had items and were left as they are.` : ""),
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        {hasLocations ? (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} />
            Replace existing items
          </label>
        ) : null}
        <button type="button" disabled={busy} onClick={() => void run()} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
          {busy ? "Loading..." : "Load Kuliyapitiya BOQ"}
        </button>
      </div>
      {message ? <p className="max-w-md text-right text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}

export function NewLocationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", boqNumber: "", category: "COMMON_UNIT", evaluationFormat: "SCHEDULED", boqAmount: "" });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Add a location
      </button>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const created = (await sendJson("/api/dr/locations", "POST", form)) as { id?: string };
          router.push(created.id ? `/dr/boq/${created.id}` : "/dr/boq");
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Unable to add the location.");
          setBusy(false);
        }
      }}
    >
      <h2 className="text-base font-semibold text-slate-950 md:col-span-3">New location</h2>
      <label>
        <span className="label">Code</span>
        <input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="control" placeholder="KUL-29" />
      </label>
      <label className="md:col-span-2">
        <span className="label">Name</span>
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="control" />
      </label>
      <label>
        <span className="label">BOQ number</span>
        <input value={form.boqNumber} onChange={(event) => setForm({ ...form, boqNumber: event.target.value })} className="control" inputMode="numeric" />
      </label>
      <label>
        <span className="label">Category</span>
        <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="control">
          {locationCategories.map((category) => (
            <option key={category} value={category}>
              {locationCategoryLabels[category]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Report format</span>
        <select value={form.evaluationFormat} onChange={(event) => setForm({ ...form, evaluationFormat: event.target.value })} className="control">
          <option value="SCHEDULED">Tick format (frequency)</option>
          <option value="RATE_BASED">Rate based (quantity x rate)</option>
        </select>
      </label>
      <label>
        <span className="label">Fixed BOQ amount (optional)</span>
        <input value={form.boqAmount} onChange={(event) => setForm({ ...form, boqAmount: event.target.value })} className="control" inputMode="decimal" placeholder="Sum of items" />
      </label>
      {error ? <p className="text-sm text-red-700 md:col-span-3">{error}</p> : null}
      <div className="flex gap-3 md:col-span-3">
        <button type="submit" disabled={busy} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving..." : "Create location"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
