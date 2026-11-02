import { AppShell } from "@/app/_components/app-shell";
import { PeriodPicker } from "@/app/_components/period-picker";
import { ReportsTable } from "@/app/_components/reports-table";
import { PageHeader } from "@/app/_components/ui";
import { roleLabel } from "@/lib/application-roles";
import { listReportsForPeriod } from "@/lib/evaluation-reports";
import { requirePageUser } from "@/lib/page-auth";
import { periodFromSearchParam, periodKey, periodLabel } from "@/lib/periods";
import { prisma } from "@/lib/prisma";

export default async function MyReportsPage({ searchParams }: PageProps<"/reports">) {
  const appUser = await requirePageUser(["PHI", "FACULTY_COORDINATOR", "SUB_WARDEN", "CURATOR", "UNIT_OFFICER"]);
  const params = await searchParams;
  const period = periodFromSearchParam(params.period);
  const rows = await listReportsForPeriod(prisma, appUser, period);
  const toDo = rows.filter((row) => !row.report || row.report.status === "DRAFT" || row.report.status === "RETURNED").length;

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow={roleLabel(appUser.role)}
          title={`Evaluation reports - ${periodLabel(period)}`}
          description={
            <>
              Fill in the evaluation cleaning report of each of your locations row by row, then send it to the Deputy Registrar.
              {toDo ? ` ${toDo} report${toDo === 1 ? "" : "s"} still to send for this month.` : rows.length ? " All reports of this month have been sent." : ""}
            </>
          }
          actions={<PeriodPicker period={period} />}
        />
        <ReportsTable rows={rows} period={periodKey(period)} />
      </div>
    </AppShell>
  );
}
