import { redirect } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { getAuthContext } from "@/lib/auth";
import {
  listCleaningWorkers,
  listWorkerLocationOptions,
  type CleaningWorkerItem,
  type WorkerLocationOption,
} from "@/lib/cleaning-workers";
import { prisma } from "@/lib/prisma";
import { WorkersClient } from "./workers-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GaaWorkersPage({ searchParams }: { searchParams: SearchParams }) {
  const { sessionUser, appUser } = await getAuthContext();
  if (!sessionUser) redirect("/login");
  if (!appUser || appUser.role !== "GAA") {
    return <main className="p-8 text-sm text-slate-700">Only GAA users can manage cleaning workers.</main>;
  }

  const params = await searchParams;
  const filters = {
    query: firstString(params.query) ?? "",
    status: firstString(params.status) ?? "",
    locationId: firstString(params.locationId) ?? "",
  };

  let workers: CleaningWorkerItem[] = [];
  let locations: WorkerLocationOption[] = [];
  let pageError: string | null = null;
  try {
    [workers, locations] = await Promise.all([
      listCleaningWorkers(prisma, filters),
      listWorkerLocationOptions(prisma),
    ]);
  } catch (error) {
    console.error("Unable to load cleaning workers", error);
    pageError = "Unable to load cleaning workers right now. Please try again.";
  }

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">Assignments</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Cleaning Workers</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Register cleaning workers and assign them to locations with their monthly allocated amount. Active
            assignments make up the total workforce PHIs see when recording daily attendance.
          </p>
        </header>

        <form method="get" className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <input
              name="query"
              defaultValue={filters.query}
              placeholder="Worker name..."
              className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Location</span>
            <select name="locationId" defaultValue={filters.locationId} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} - {location.name}
                  {location.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
            <select name="status" defaultValue={filters.status} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex gap-3 sm:col-span-4">
            <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
              Apply filters
            </button>
            <a href="/gaa/workers" className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Reset
            </a>
          </div>
        </form>

        {pageError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{pageError}</div>
        ) : (
          <WorkersClient workers={workers} locations={locations} filtered={Boolean(filters.query || filters.status || filters.locationId)} />
        )}
      </div>
    </AppShell>
  );
}
