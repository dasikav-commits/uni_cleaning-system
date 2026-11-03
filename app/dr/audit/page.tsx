import Link from "next/link";
import type { Prisma } from "@/app/generated/prisma/client";
import { AppShell } from "@/app/_components/app-shell";
import { PageHeader } from "@/app/_components/ui";
import { roleLabel } from "@/lib/application-roles";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export default async function DrAuditPage({ searchParams }: PageProps<"/dr/audit">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const value = (key: string) => {
    const raw = params[key];
    return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  };
  const query = value("query").slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Number(value("page")) || 1));

  const where: Prisma.ActivityLogWhereInput = query
    ? {
        OR: [
          { description: { contains: query, mode: "insensitive" } },
          { entityType: { contains: query, mode: "insensitive" } },
          { entityId: { contains: query, mode: "insensitive" } },
          { user: { name: { contains: query, mode: "insensitive" } } },
          { user: { email: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, timestamp: true, action: true, entityType: true, description: true, user: { select: { name: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (target: number) => `/dr/audit?${new URLSearchParams({ ...(query ? { query } : {}), page: String(target) }).toString()}`;

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader eyebrow="Set-up · Deputy Registrar" title="Audit log" description="Every change to reports, the BOQ, users and assignments is recorded here." />
        <form className="flex gap-3 rounded-3xl border border-slate-200 bg-white p-5">
          <input name="query" defaultValue={query} placeholder="Search user, description, entity..." className="control flex-1" />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Search</button>
        </form>
        <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">User</th>
                <th className="th">Action</th>
                <th className="th">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="td whitespace-nowrap">{log.timestamp.toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}</td>
                    <td className="td">
                      {log.user.name}
                      <span className="block text-xs text-slate-500">{roleLabel(log.user.role)}</span>
                    </td>
                    <td className="td whitespace-nowrap text-xs font-semibold">
                      {log.action.replaceAll("_", " ").toLowerCase()}
                      <span className="block font-normal text-slate-500">{log.entityType}</span>
                    </td>
                    <td className="td">{log.description ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="td py-8 text-center text-slate-500" colSpan={4}>
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-4 text-sm text-slate-500">
            <span>
              Page {page} of {totalPages} ({total} records)
            </span>
            <span className="flex gap-4">
              {page > 1 ? <Link href={link(page - 1)} className="font-semibold text-cyan-700">← Newer</Link> : null}
              {page < totalPages ? <Link href={link(page + 1)} className="font-semibold text-cyan-700">Older →</Link> : null}
            </span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
