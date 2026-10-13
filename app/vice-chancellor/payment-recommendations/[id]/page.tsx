import { redirect } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVcRecommendation } from "@/lib/vc-review";
import { VcDecisionPanel } from "./vc-decision-panel";

function money(value: { toString(): string }) {
  return `LKR ${Number(value.toString()).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DECISION_LABEL: Record<string, string> = {
  APPROVE: "Approved",
  REJECT: "Rejected",
  CLARIFICATION: "Clarification requested",
};

export default async function VcRecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { sessionUser, appUser } = await getAuthContext();
  if (!sessionUser) redirect("/login");
  if (!appUser || appUser.role !== "VICE_CHANCELLOR" || !appUser.active) {
    return <main className="p-8">Access denied. Only Vice Chancellor users can review payment recommendations.</main>;
  }

  const recommendation = await getVcRecommendation(prisma, appUser, (await params).id);
  if (!recommendation) {
    return (
      <AppShell user={appUser}>
        <p className="text-sm text-slate-600">This recommendation was not found or has not been sent for Vice Chancellor review.</p>
      </AppShell>
    );
  }

  const additionalTotal = recommendation.additionalTasks.reduce((sum, task) => sum + Number(task.recommendedAmount.toString()), 0);
  const period = `${recommendation.report.year}-${String(recommendation.report.month).padStart(2, "0")}`;

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">Vice Chancellor Review</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {recommendation.report.location.code} · {recommendation.report.location.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {period} · Version {recommendation.version} · Status {recommendation.status}
            {recommendation.submittedBy ? ` · Submitted by ${recommendation.submittedBy.name}` : ""}
            {recommendation.sentToVcAt ? ` on ${recommendation.sentToVcAt.toLocaleString("en-GB")}` : ""}
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Stat label="Cleaning Tasks" value={money(recommendation.locationCleaningTotal)} />
          <Stat label="Additional Tasks" value={money(additionalTotal)} />
          <Stat label="Overall Recommended" value={money(recommendation.overallRecommendedPayment)} />
        </section>

        <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Cleaning Task Calculations</h2>
          <table className="min-w-full">
            <thead>
              <tr>
                {["Task", "Frequency", "Completion", "Original", "Recommendation", "Recommended", "Change reason"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left text-xs uppercase text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recommendation.taskCalculations.map((task) => (
                <tr key={task.id} className="border-t">
                  <td className="px-3 py-3 text-sm">{task.monthlyTaskSummary.taskNameSnapshot}</td>
                  <td className="px-3 py-3 text-sm">{task.monthlyTaskSummary.frequencySnapshot}</td>
                  <td className="px-3 py-3 text-sm">{task.completionPercentage.toString()}%</td>
                  <td className="px-3 py-3 text-sm">{money(task.originalAmount)}</td>
                  <td className="px-3 py-3 text-sm">{money(task.recommendationAmount)}</td>
                  <td className="px-3 py-3 text-sm font-semibold">{money(task.recommendedAmount)}</td>
                  <td className="px-3 py-3 text-sm text-slate-600">{task.changeReason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Additional Cleaning Tasks</h2>
          {recommendation.additionalTasks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No additional tasks.</p>
          ) : (
            recommendation.additionalTasks.map((task) => (
              <p key={task.id} className="mt-3 text-sm text-slate-700">
                {task.taskName} ({task.category}) · {task.completionPercentage.toString()}% of {money(task.allocatedAmount)} ={" "}
                <strong>{money(task.recommendedAmount)}</strong>
                {task.remark ? ` · ${task.remark}` : ""}
              </p>
            ))
          )}
        </section>

        {recommendation.remarks ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">GAA Remarks</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{recommendation.remarks}</p>
          </section>
        ) : null}

        {recommendation.vcApprovals.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Decision History</h2>
            <ul className="mt-3 space-y-2">
              {recommendation.vcApprovals.map((entry) => (
                <li key={entry.id} className="text-sm text-slate-700">
                  <strong>{DECISION_LABEL[entry.decision] ?? entry.decision}</strong> by {entry.vcUser.name} on{" "}
                  {entry.decidedAt.toLocaleString("en-GB")}
                  {entry.remarks ? ` · ${entry.remarks}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recommendation.status === "VC_PENDING" ? <VcDecisionPanel recommendationId={recommendation.id} /> : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}
