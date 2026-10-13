"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CleaningWorkerItem, WorkerAssignmentItem, WorkerLocationOption } from "@/lib/cleaning-workers";

const inputClass = "rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900";
const primaryButton = "rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60";
const secondaryButton =
  "rounded-2xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";

function money(value: string) {
  return `LKR ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Sends a JSON request, refreshes the server data on success and exposes the pending/error state. */
function useMutation() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(url: string, method: "POST" | "PATCH", body: Record<string, unknown>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(url, {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          setError(payload.error ?? "Something went wrong. Please try again.");
          return;
        }
        onSuccess?.();
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return { run, error, isPending };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="text-sm font-medium text-red-700">{error}</p> : null;
}

function CreateWorkerForm({ locations }: { locations: WorkerLocationOption[] }) {
  const { run, error, isPending } = useMutation();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    run("/api/gaa/workers", "POST", { name, locationId: locationId || undefined, allocatedAmount: locationId ? allocatedAmount : undefined }, () => {
      setName("");
      setLocationId("");
      setAllocatedAmount("");
    });
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Add a cleaning worker</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Location (optional)
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={`${inputClass} bg-white`}>
            <option value="">Assign later</option>
            {locations.filter((location) => location.active).map((location) => (
              <option key={location.id} value={location.id}>{location.code} - {location.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Monthly allocation (LKR)
          <input
            value={allocatedAmount}
            onChange={(event) => setAllocatedAmount(event.target.value)}
            inputMode="decimal"
            placeholder="e.g. 25000.00"
            disabled={!locationId}
            required={Boolean(locationId)}
            pattern="\d+(\.\d{1,2})?"
            className={`${inputClass} disabled:bg-slate-50`}
          />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={isPending} className={primaryButton}>{isPending ? "Saving..." : "Add worker"}</button>
        </div>
      </div>
      <div className="mt-2"><ErrorText error={error} /></div>
    </form>
  );
}

function AssignmentRow({ assignment, workerActive }: { assignment: WorkerAssignmentItem; workerActive: boolean }) {
  const { run, error, isPending } = useMutation();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(assignment.allocatedAmount);
  const url = `/api/gaa/worker-assignments/${assignment.id}`;

  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2 text-sm text-slate-800">
        {assignment.locationCode} - {assignment.locationName}
        {assignment.locationActive ? null : <span className="ml-2 text-xs text-amber-700">(location inactive)</span>}
      </td>
      <td className="px-3 py-2 text-sm text-slate-800">
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(url, "PATCH", { allocatedAmount: amount }, () => setEditing(false));
            }}
          >
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" pattern="\d+(\.\d{1,2})?" required className={`${inputClass} w-32 py-1`} />
            <button type="submit" disabled={isPending} className={secondaryButton}>Save</button>
            <button type="button" onClick={() => { setEditing(false); setAmount(assignment.allocatedAmount); }} className={secondaryButton}>Cancel</button>
          </form>
        ) : (
          money(assignment.allocatedAmount)
        )}
        <ErrorText error={error} />
      </td>
      <td className="px-3 py-2 text-sm">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${assignment.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
          {assignment.active ? "Active" : "Removed"}
        </span>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          {!editing && assignment.active ? (
            <button type="button" onClick={() => setEditing(true)} className={secondaryButton}>Edit amount</button>
          ) : null}
          {assignment.active ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (window.confirm(`Remove this worker from ${assignment.locationCode}?`)) run(url, "PATCH", { active: false });
              }}
              className={secondaryButton}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || !workerActive || !assignment.locationActive}
              title={!workerActive ? "Activate the worker first" : !assignment.locationActive ? "The location is inactive" : undefined}
              onClick={() => run(url, "PATCH", { active: true })}
              className={secondaryButton}
            >
              Re-assign
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AssignForm({ worker, locations }: { worker: CleaningWorkerItem; locations: WorkerLocationOption[] }) {
  const { run, error, isPending } = useMutation();
  const [locationId, setLocationId] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState("");
  const assigned = new Set(worker.assignments.filter((item) => item.active).map((item) => item.locationId));
  const options = locations.filter((location) => location.active && !assigned.has(location.id));

  if (!worker.active) return null;
  if (!options.length) return <p className="text-xs text-slate-500">Assigned to every active location.</p>;

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(`/api/gaa/workers/${worker.id}/assignments`, "POST", { locationId, allocatedAmount }, () => {
          setLocationId("");
          setAllocatedAmount("");
        });
      }}
    >
      <select value={locationId} onChange={(event) => setLocationId(event.target.value)} required className={`${inputClass} bg-white py-1.5`}>
        <option value="">Assign to location...</option>
        {options.map((location) => (
          <option key={location.id} value={location.id}>{location.code} - {location.name}</option>
        ))}
      </select>
      <input
        value={allocatedAmount}
        onChange={(event) => setAllocatedAmount(event.target.value)}
        inputMode="decimal"
        pattern="\d+(\.\d{1,2})?"
        required
        placeholder="Monthly allocation (LKR)"
        className={`${inputClass} w-52 py-1.5`}
      />
      <button type="submit" disabled={isPending} className={secondaryButton}>{isPending ? "Assigning..." : "Assign"}</button>
      <ErrorText error={error} />
    </form>
  );
}

function WorkerCard({ worker, locations }: { worker: CleaningWorkerItem; locations: WorkerLocationOption[] }) {
  const { run, error, isPending } = useMutation();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(worker.name);
  const url = `/api/gaa/workers/${worker.id}`;
  const activeAssignments = worker.assignments.filter((item) => item.active).length;

  return (
    <article className={`rounded-3xl border bg-white p-5 shadow-sm ${worker.active ? "border-slate-200" : "border-slate-200 opacity-75"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {renaming ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                run(url, "PATCH", { name }, () => setRenaming(false));
              }}
            >
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} className={`${inputClass} py-1.5`} />
              <button type="submit" disabled={isPending} className={secondaryButton}>Save</button>
              <button type="button" onClick={() => { setRenaming(false); setName(worker.name); }} className={secondaryButton}>Cancel</button>
            </form>
          ) : (
            <h3 className="text-lg font-semibold text-slate-950">{worker.name}</h3>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {worker.active ? "Active" : "Inactive"} · {activeAssignments} active location{activeAssignments === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {!renaming ? <button type="button" onClick={() => setRenaming(true)} className={secondaryButton}>Rename</button> : null}
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (
                !worker.active ||
                window.confirm(`Deactivate ${worker.name}? The worker will also be removed from all of their locations.`)
              ) {
                run(url, "PATCH", { active: !worker.active });
              }
            }}
            className={secondaryButton}
          >
            {worker.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>
      <ErrorText error={error} />

      {worker.assignments.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                {["Location", "Monthly allocation", "Status", ""].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {worker.assignments.map((assignment) => (
                <AssignmentRow key={`${assignment.id}:${assignment.updatedAt}`} assignment={assignment} workerActive={worker.active} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Not assigned to any location yet.</p>
      )}
      <div className="mt-4">
        <AssignForm worker={worker} locations={locations} />
      </div>
    </article>
  );
}

export function WorkersClient({
  workers,
  locations,
  filtered,
}: {
  workers: CleaningWorkerItem[];
  locations: WorkerLocationOption[];
  filtered: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <CreateWorkerForm locations={locations} />
      {workers.length ? (
        workers.map((worker) => <WorkerCard key={worker.id} worker={worker} locations={locations} />)
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {filtered ? "No workers match these filters." : "No cleaning workers yet. Add the first one above."}
        </div>
      )}
    </div>
  );
}
