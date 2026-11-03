import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { PrintButton } from "@/app/_components/print-button";
import { PageHeader } from "@/app/_components/ui";
import { getPaymentReport } from "@/lib/monthly-process";
import { requirePageUser } from "@/lib/page-auth";
import { periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { PaymentReportClient } from "./payment-report-client";

export default async function FinalReportPage({ searchParams }: PageProps<"/dr/reports/final">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const params = await searchParams;
  const period = periodFromSearchParam(params.period);
  const view = await getPaymentReport(prisma, period);
  const key = periodKey(period);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 print-report">
        <PageHeader
          eyebrow="Step 6 · Deputy Registrar"
          title={`Cleaning & Janitorial Services - ${periodLabel(period)}`}
          description="Kuliyapitiya Premises. Approved amounts come from the accepted evaluation reports; the deduction for absence comes from the approved PHI attendance. Finalize when every report is accepted - the figures are then frozen."
          actions={
            <>
              <PeriodPicker period={period} />
              <a href={`/api/dr/reports/final?period=${key}`} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                Download Excel
              </a>
              <PrintButton />
            </>
          }
        />
        <PaymentReportClient key={`${key}-${view.status}`} initial={view} period={key} />
      </div>
    </AppShell>
  );
}
