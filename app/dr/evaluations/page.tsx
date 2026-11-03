import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { ReportsTable } from "@/app/_components/reports-table";
import { PageHeader } from "@/app/_components/ui";
import { isLocationCategory, locationCategories, locationCategoryLabels } from "@/lib/application-roles";
import { listReportsForPeriod } from "@/lib/evaluation-reports";
import { requirePageUser } from "@/lib/page-auth";
import { periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { AcceptAllButton } from "./accept-all-button";

export default async function DrEvaluationsPage({ searchParams }: PageProps<"/dr/evaluations">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const period = periodFromSearchParam(params.period);
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = rawCategory && isLocationCategory(rawCategory) ? rawCategory : undefined;
  const rows = await listReportsForPeriod(prisma, appUser, period, { category });
  const key = periodKey(period);
  const submitted = rows.filter((row) => row.report?.status === "SUBMITTED").length;
  const accepted = rows.filter((row) => row.report?.status === "ACCEPTED").length;

  const tab = (value: string | undefined, label: string) => (
    <Link
      key={label}
      href={`/dr/evaluations?period=${key}${value ? `&category=${value}` : ""}`}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${category === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {label}
    </Link>
  );

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="Step 1 · Deputy Registrar"
          title={`Evaluation reports - ${periodLabel(period)}`}
          description={`${accepted} of ${rows.length} accepted · ${submitted} waiting for your review. Open a report to accept it or return it for correction. You can also fill in a report yourself.`}
          actions={
            <>
              <PeriodPicker period={period} />
              <AcceptAllButton period={key} category={category} count={submitted} />
            </>
          }
        />
        <nav className="flex flex-wrap gap-2">
          {tab(undefined, "All")}
          {locationCategories.map((value) => tab(value, locationCategoryLabels[value]))}
        </nav>
        <ReportsTable rows={rows} period={key} showReporters />
      </div>
    </AppShell>
  );
}
