"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { locationCategoryLabels, roleLabel, suggestedRoleForCategory, type LocationCategoryKey } from "@/lib/application-roles";

type User = { id: string; name: string; email: string; role: string; active: boolean };
type Location = {
  id: string;
  code: string;
  name: string;
  boqNumber: number | null;
  category: string;
  reportingAssignments: { id: string; user: User }[];
};

export function AssignmentBoard({ locations, users }: { locations: Location[]; users: User[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  async function assign(userId: string, locationId: string, active: boolean) {
    setBusy(locationId);
    setError(null);
    const response = await fetch("/api/dr/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, locationId, active }),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(json.error ?? "Unable to update the assignment.");
      return;
    }
    router.refresh();
  }

  const unassigned = locations.filter((location) => !location.reportingAssignments.some((assignment) => assignment.user.active)).length;
  const shown = locations.filter((location) => filter === "ALL" || (filter === "UNASSIGNED" ? !location.reportingAssignments.length : location.category === filter));
  const categories = [...new Set(locations.map((location) => location.category))];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">All locations ({locations.length})</option>
          <option value="UNASSIGNED">Not assigned ({unassigned})</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {locationCategoryLabels[category as LocationCategoryKey] ?? category}
            </option>
          ))}
        </select>
        {!users.length ? <p className="text-sm text-amber-700">There are no reporting logins yet.</p> : null}
      </div>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">No.</th>
              <th className="th">Location</th>
              <th className="th">Reported by</th>
              <th className="th">Add a login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.map((location) => {
              const assignedIds = new Set(location.reportingAssignments.map((assignment) => assignment.user.id));
              const suggested = suggestedRoleForCategory[location.category as LocationCategoryKey];
              const available = users
                .filter((user) => user.active && !assignedIds.has(user.id))
                .sort((a, b) => Number(b.role === suggested) - Number(a.role === suggested) || a.name.localeCompare(b.name));
              return (
                <tr key={location.id} className={location.reportingAssignments.length ? "" : "bg-amber-50/50"}>
                  <td className="td">{location.boqNumber ?? "-"}</td>
                  <td className="td min-w-[12rem]">
                    <span className="font-semibold text-slate-900">{location.name}</span>
                    <p className="text-xs text-slate-500">
                      {locationCategoryLabels[location.category as LocationCategoryKey] ?? location.category} · usually {roleLabel(suggested)}
                    </p>
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-2">
                      {location.reportingAssignments.map((assignment) => (
                        <span
                          key={assignment.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${assignment.user.active ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-slate-100 text-slate-500 line-through"}`}
                          title={assignment.user.email}
                        >
                          {assignment.user.name} <span className="text-slate-500">({roleLabel(assignment.user.role)})</span>
                          <button
                            type="button"
                            disabled={busy === location.id}
                            onClick={() => void assign(assignment.user.id, location.id, false)}
                            className="ml-1 font-bold text-slate-500 hover:text-red-700"
                            aria-label={`Remove ${assignment.user.name} from ${location.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {!location.reportingAssignments.length ? <span className="text-xs font-semibold text-amber-700">Nobody - only the DR can fill it in</span> : null}
                    </div>
                  </td>
                  <td className="td">
                    <select
                      value=""
                      disabled={busy === location.id || !available.length}
                      onChange={(event) => {
                        if (event.target.value) void assign(event.target.value, location.id, true);
                      }}
                      className="w-56 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      aria-label={`Add a login to ${location.name}`}
                    >
                      <option value="">{busy === location.id ? "Saving..." : "Select a login..."}</option>
                      {available.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({roleLabel(user.role)})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
