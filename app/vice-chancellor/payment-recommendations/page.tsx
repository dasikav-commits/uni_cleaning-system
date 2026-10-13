import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listVcRecommendations, type VcRecommendationFilter } from "@/lib/vc-review";

const FILTERS: { value: VcRecommendationFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "decided", label: "Decided" },
  { value: "all", label: "All" },
];

const STATUS_LABEL: Record<string, string> = {
  VC_PENDING: "Pending review",
  VC_APPROVED: "Approved",
  VC_REJECTED: "Rejected",
  CLARIFICATION_REQUESTED: "Clarification requested",
};

const STATUS_STYLE: Record<string, string> = {
  VC_PENDING: "bg-amber-100 text-amber-800",
  VC_APPROVED: "bg-emerald-100 text-emerald-800",
  VC_REJECTED: "bg-red-100 text-red-800",
  CLARIFICATION_REQUESTED: "bg-sky-100 text-sky-800",
};

function money(value: { toString(): string }) {
  return `LKR ${Number(value.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function VcPaymentRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionUser, appUser } = await getAuthContext();
  if (!sessionUser) redirect("/login");
  if (!appUser || appUser.role !== "VICE_CHANCELLOR" || !appUser.active) {
    return <main className="p-8">Access denied. Only Vice Chancellor users can review payment recommendations.</main>;
  }

  const params = await searchParams;
  const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter: VcRecommendationFilter = rawFilter === "decided" || rawFilter === "all" ? rawFilter : "pending";
  const recommendations = await listVcRecommendations(prisma, appUser, filter);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">Vice Chancellor</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Payment Recommendations</h1>
          <p className="mt-2 text-sm text-slate-600">
            Review the payment recommendations the GAA has submitted, then approve, reject or request clarification.
          </p>
        </header>

        <nav className="flex gap-2">
          {FILTERS.map((item) => (
            <Link
              key={item.value}
              href={`/vice-chancellor/payment-recommendations?filter=${item.value}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                filter === item.value ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          {recommendations.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">
              {filter === "pending" ? "No recommendations are waiting for your review." : "No recommendations found."}
            </p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Month", "Location", "Recommended", "Submitted", "Status", ""].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recommendations.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 text-sm">
                      {item.report.year}-{String(item.report.month).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <strong>{item.report.location.code}</strong> {item.report.location.name}
                    </td>
                    <td className="px-5 py-4 text-sm">{money(item.overallRecommendedPayment)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.sentToVcAt ? item.sentToVcAt.toLocaleDateString("en-GB") : "-"}
                      {item.submittedBy ? ` · ${item.submittedBy.name}` : ""}
                      {item.version > 1 ? ` · v${item.version}` : ""}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[item.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <Link className="font-semibold text-cyan-700" href={`/vice-chancellor/payment-recommendations/${item.id}`}>
                        {item.status === "VC_PENDING" ? "Review" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </AppShell>
  );
}
