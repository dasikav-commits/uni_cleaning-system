import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/evaluation-calc";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">{title}</h1>
          {description ? <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3 print:hidden">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Card({ title, description, actions, children, className = "" }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {title || actions ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2 print:hidden">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

const tones = {
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-red-200 bg-red-50 text-red-700",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

const evaluationStatus: Record<string, { label: string; tone: Tone }> = {
  NOT_STARTED: { label: "Not started", tone: "slate" },
  DRAFT: { label: "Draft", tone: "amber" },
  SUBMITTED: { label: "Sent to DR", tone: "cyan" },
  RETURNED: { label: "Returned", tone: "red" },
  ACCEPTED: { label: "Accepted", tone: "emerald" },
};

export function EvaluationStatusBadge({ status }: { status: string | null | undefined }) {
  const meta = evaluationStatus[status ?? "NOT_STARTED"] ?? { label: status ?? "", tone: "slate" as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const phiStatus: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "amber" },
  SUBMITTED: { label: "Sent to DR", tone: "cyan" },
  RESUBMITTED: { label: "Re-sent to DR", tone: "cyan" },
  CORRECTION_REQUESTED: { label: "Correction requested", tone: "red" },
  ADMIN_APPROVED: { label: "Approved by DR", tone: "emerald" },
  ADMIN_REJECTED: { label: "Rejected by DR", tone: "red" },
};

export function PhiStatusBadge({ status }: { status: string | null | undefined }) {
  const meta = phiStatus[status ?? ""] ?? { label: status ?? "Not received", tone: "slate" as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function Money({ cents, dash = true, className = "" }: { cents: number | null | undefined; dash?: boolean; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{cents === null || cents === undefined ? "" : formatMoney(cents, { dashForZero: dash })}</span>;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          : "rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      }
    >
      {children}
    </Link>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">{children}</p>;
}
