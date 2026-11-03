import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { PageHeader } from "@/app/_components/ui";
import { getMonthlyOverview, type StepState } from "@/lib/monthly-process";
import { requirePageUser } from "@/lib/page-auth";
import { periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";

const stateStyle: Record<StepState, { ring: string; badge: string; label: string }> = {
  done: { ring: "border-emerald-300 bg-emerald-50", badge: "bg-emerald-600 text-white", label: "Done" },
  "in-progress": { ring: "border-cyan-300 bg-cyan-50", badge: "bg-cyan-600 text-white", label: "In progress" },
  waiting: { ring: "border-slate-200 bg-white", badge: "bg-slate-200 text-slate-700", label: "Waiting" },
  blocked: { ring: "border-slate-200 bg-slate-50", badge: "bg-slate-200 text-slate-500", label: "Not ready" },
};

export default async function DrDashboardPage({ searchParams }: PageProps<"/dr">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const period = periodFromSearchParam(params.period);
  const overview = await getMonthlyOverview(prisma, period);
  const key = periodKey(period);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          eyebrow="Deputy Registrar"
          title={`Monthly process - ${periodLabel(period)}`}
          description="Evaluation reports → PHI attendance → Main Administration Building → Amount of work done → Attendance report → Cleaning & Janitorial Services report."
          actions={<PeriodPicker period={period} />}
        />

        {overview.activeLocations === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <p className="font-semibold">No locations yet</p>
            <p className="mt-1">
              Load the Kuliyapitiya BOQ (28 services with their items, frequencies and amounts) on the{" "}
              <Link href="/dr/boq" className="font-semibold underline">
                BOQ &amp; locations
              </Link>{" "}
              page, then create the logins and assign their locations.
            </p>
          </div>
        ) : null}

        <ol className="grid gap-4 md:grid-cols-2">
          {overview.steps.map((step, index) => {
            const style = stateStyle[step.state];
            const href = `${step.href}${step.href.includes("?") ? "&" : "?"}period=${key}`;
            return (
              <li key={step.key} className={`rounded-3xl border p-5 shadow-sm ${style.ring}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{index + 1}</span>
                    <div>
                      <h2 className="font-semibold text-slate-950">{step.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>{style.label}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{step.detail}</p>
                <Link href={href} className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Open
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </AppShell>
  );
}
