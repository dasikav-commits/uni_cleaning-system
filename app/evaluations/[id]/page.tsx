import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { getEvaluationReport } from "@/lib/evaluation-reports";
import { requirePageUser } from "@/lib/page-auth";
import { periodKey } from "@/lib/periods";
import { prisma } from "@/lib/prisma";
import { EvaluationEditor } from "./evaluation-editor";

export default async function EvaluationReportPage({ params }: PageProps<"/evaluations/[id]">) {
  const appUser = await requirePageUser();
  const { id } = await params;

  let report: Awaited<ReturnType<typeof getEvaluationReport>>;
  try {
    report = await getEvaluationReport(prisma, appUser, id);
  } catch (error) {
    if (error instanceof Error && "status" in error && (error as { status: number }).status === 403) {
      return (
        <AppShell user={appUser}>
          <div className="mx-auto max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-8 text-sm text-red-800">
            <h1 className="text-xl font-semibold">Not your location</h1>
            <p className="mt-2">{error.message}</p>
          </div>
        </AppShell>
      );
    }
    throw error;
  }
  if (!report) notFound();

  const isDr = appUser.role === "DEPUTY_REGISTRAR";
  const back = isDr ? `/dr/evaluations?period=${periodKey(report.period)}` : `/reports?period=${periodKey(report.period)}`;

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <Link href={back} className="text-sm font-semibold text-slate-600 hover:text-slate-900 print:hidden">
          ← Back to the reports of the month
        </Link>
        <EvaluationEditor key={`${report.id}-${report.status}-${report.updatedAt.toString()}`} initial={report} isDr={isDr} />
      </div>
    </AppShell>
  );
}
