"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OfficerLocationSummary, OfficerMonitoringData } from "@/lib/evaluating-officer-monitoring";
import { allowedEvaluationResults } from "@/lib/evaluating-officer-monitoring";

type Props = {
  initialData: OfficerMonitoringData;
  assignedLocations: OfficerLocationSummary[];
  currentFilters: {
    date: string;
    locationId: string;
  };
};

type RowDraft = {
  result: string;
  remark: string;
};

export function EvaluatingOfficerDailyMonitoringClient({
  initialData,
  assignedLocations,
  currentFilters,
}: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() => {
    const initialDrafts: Record<string, RowDraft> = {};
    for (const task of initialData.tasks) {
      initialDrafts[task.locationTaskId] = {
        result: task.result ?? "",
        remark: task.remark ?? "",
      };
    }
    return initialDrafts;
  });
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const selectedLocation = useMemo(
    () => assignedLocations.find((location) => location.id === initialData.selectedLocationId) ?? null,
    [assignedLocations, initialData.selectedLocationId],
  );

  const refresh = () => router.refresh();

  const editMode = initialData.editMode ?? "TODAY";
  const correctionMode = editMode === "CORRECTION";
  // Finalized entries are read-only except while a correction is requested.
  const isLocked = (task: { eligible: boolean; finalized: boolean }) =>
    !task.eligible || (task.finalized && !correctionMode);
  const monthRange = useMemo(() => {
    const [year, month] = initialData.selectedDate.split("-").map(Number);
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const last = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { first, last };
  }, [initialData.selectedDate]);

  const submit = async (finalize: boolean) => {
    setFeedback(null);
    const response = await fetch("/api/evaluating-officer/daily-monitoring", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: initialData.selectedLocationId,
        evaluationDate: initialData.selectedDate,
        finalize,
        items: initialData.tasks
          .filter((task) => task.eligible)
          .map((task) => ({
            locationTaskId: task.locationTaskId,
            result: drafts[task.locationTaskId]?.result ?? "",
            remark: drafts[task.locationTaskId]?.remark ?? "",
          })),
      }),
    });

    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setFeedback({
        kind: "error",
        text: json.error ?? "Unable to save the evaluation.",
      });
      return;
    }

    setFeedback({
      kind: "success",
      text: finalize ? "Evaluation finalized successfully." : "Evaluation saved successfully.",
    });
    refresh();
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Assigned Locations</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{assignedLocations.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Selected Location</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {selectedLocation ? selectedLocation.code : "None"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Date</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{initialData.selectedDate}</p>
          <p className="mt-1 text-xs text-slate-500">
            {editMode === "CORRECTION" ? "Correction requested" : editMode === "BACKFILL" ? "Filling in missing days" : "Today only"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Eligible Tasks</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {initialData.tasks.filter((task) => task.eligible).length}
          </p>
        </div>
      </section>

      {editMode !== "TODAY" ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            correctionMode ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"
          }`}
        >
          {correctionMode
            ? "Administration requested a correction for this month's report. You can change any evaluation of this month, including finalized ones. When the corrections are done, resubmit the report from the monthly report page."
            : "This month's report is incomplete. Fill in the missing evaluations; a GAA will then re-run monthly processing to submit the report."}{" "}
          {initialData.editReportId ? (
            <Link href={`/monthly-reports/${initialData.editReportId}`} className="font-semibold underline">
              Open the monthly report
            </Link>
          ) : null}{" "}
          <Link
            href={`/daily-monitoring${initialData.selectedLocationId ? `?locationId=${initialData.selectedLocationId}` : ""}`}
            className="font-semibold underline"
          >
            Back to today
          </Link>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cleaning evaluation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Evaluate only the tasks eligible for the selected date.
            </p>
          </div>
        </div>

        <form
          method="get"
          action="/evaluating-officer/daily-monitoring"
          className="mt-6 grid gap-3 md:grid-cols-3"
        >
          <select
            name="locationId"
            defaultValue={currentFilters.locationId}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-900"
          >
            <option value="">Select Location</option>
            {assignedLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.code} - {location.name}
              </option>
            ))}
          </select>
          {editMode === "TODAY" ? (
            <>
              <div className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700">
                <p className="text-xs uppercase tracking-wide text-slate-400">Date locked</p>
                <p className="mt-1 font-medium">{currentFilters.date}</p>
              </div>
              <input type="hidden" name="date" value={currentFilters.date} />
            </>
          ) : (
            <label className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700">
              <span className="block text-xs uppercase tracking-wide text-slate-400">Date in this month</span>
              <input
                type="date"
                name="date"
                defaultValue={currentFilters.date}
                min={monthRange.first}
                max={monthRange.last}
                className="mt-1 w-full font-medium outline-none"
              />
            </label>
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Load Location
          </button>
        </form>

        <div className="mt-6 space-y-4">
          {initialData.tasks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              {initialData.selectedLocationId
                ? "No tasks are configured for this location."
                : "Select an assigned location to begin."}
            </div>
          ) : (
            initialData.tasks.map((task) => (
              <article
                key={task.locationTaskId}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{task.taskName}</p>
                    <p className="mt-1 text-sm text-slate-600">Frequency: {task.frequency}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.eligible ? (editMode === "TODAY" ? "Eligible today" : "Eligible on this date") : task.eligibilityNote ?? "Not eligible"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      task.finalized
                        ? "bg-slate-900 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {task.finalized ? "FINALIZED" : "DRAFT"}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <fieldset
                    disabled={isLocked(task)}
                    className="grid gap-2"
                  >
                    <legend className="text-sm font-medium text-slate-700">Result</legend>
                    <div className="flex flex-wrap gap-2">
                      {allowedEvaluationResults.map((value) => (
                        <label
                          key={value}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`result-${task.locationTaskId}`}
                            checked={drafts[task.locationTaskId]?.result === value}
                            onChange={() =>
                              setDrafts((current) => ({
                                ...current,
                                [task.locationTaskId]: {
                                  ...current[task.locationTaskId],
                                  result: value,
                                },
                              }))
                            }
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-slate-700">Remark</span>
                    <textarea
                      value={drafts[task.locationTaskId]?.remark ?? ""}
                      disabled={isLocked(task)}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [task.locationTaskId]: {
                            ...current[task.locationTaskId],
                            remark: event.target.value,
                          },
                        }))
                      }
                      rows={3}
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100"
                    />
                  </label>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/evaluating-officer/history"
            className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View History
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || !initialData.selectedLocationId}
              onClick={() => {
                startTransition(async () => {
                  // Awaiting keeps isPending true until the request completes (prevents double submits).
                  try {
                    await submit(false);
                  } catch {
                    setFeedback({ kind: "error", text: "Unable to reach the server. Check your connection and try again." });
                  }
                });
              }}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              disabled={isPending || !initialData.selectedLocationId}
              onClick={() => {
                startTransition(async () => {
                  // Awaiting keeps isPending true until the request completes (prevents double submits).
                  try {
                    await submit(true);
                  } catch {
                    setFeedback({ kind: "error", text: "Unable to reach the server. Check your connection and try again." });
                  }
                });
              }}
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Finalize
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
