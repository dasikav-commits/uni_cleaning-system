import type {
  PaymentRecommendationStatus,
  Prisma,
  PrismaClient,
  UserRole,
  VCDecision,
} from "@/app/generated/prisma/client";
import { PaymentRecommendationError, recommendationSelect } from "@/lib/payment-recommendations";

type Actor = { id: string; name?: string; role: UserRole; active: boolean };

export const VC_DECISIONS = ["APPROVE", "REJECT", "CLARIFICATION"] as const satisfies readonly VCDecision[];

export type VcRecommendationFilter = "pending" | "decided" | "all";

const DECIDED_STATUSES: PaymentRecommendationStatus[] = [
  "VC_APPROVED",
  "VC_REJECTED",
  "CLARIFICATION_REQUESTED",
];

/** Statuses a Vice Chancellor can see: everything that has been sent to them. */
const VC_VISIBLE_STATUSES: PaymentRecommendationStatus[] = ["VC_PENDING", ...DECIDED_STATUSES];

const DECISION_OUTCOME: Record<
  VCDecision,
  {
    status: PaymentRecommendationStatus;
    action: "VC_APPROVED" | "VC_REJECTED" | "CLARIFICATION_REQUESTED";
    event: "VC_APPROVED" | "VC_REJECTED" | "VC_REQUESTED_CLARIFICATION";
    title: string;
    verb: string;
  }
> = {
  APPROVE: {
    status: "VC_APPROVED",
    action: "VC_APPROVED",
    event: "VC_APPROVED",
    title: "Payment Recommendation Approved",
    verb: "approved",
  },
  REJECT: {
    status: "VC_REJECTED",
    action: "VC_REJECTED",
    event: "VC_REJECTED",
    title: "Payment Recommendation Rejected",
    verb: "rejected",
  },
  CLARIFICATION: {
    status: "CLARIFICATION_REQUESTED",
    action: "CLARIFICATION_REQUESTED",
    event: "VC_REQUESTED_CLARIFICATION",
    title: "Clarification Requested on Payment Recommendation",
    verb: "requested clarification on",
  },
};

function assertViceChancellor(actor: Actor) {
  if (!actor.active || actor.role !== "VICE_CHANCELLOR") {
    throw new PaymentRecommendationError(
      "ACCESS_DENIED",
      "Only active Vice Chancellor users can review payment recommendations.",
      403,
    );
  }
}

export function isVcDecision(value: unknown): value is VCDecision {
  return typeof value === "string" && (VC_DECISIONS as readonly string[]).includes(value);
}

export async function listVcRecommendations(
  prisma: Pick<PrismaClient, "paymentRecommendation">,
  actor: Actor,
  filter: VcRecommendationFilter = "pending",
) {
  assertViceChancellor(actor);
  const statuses =
    filter === "pending" ? ["VC_PENDING" as const] : filter === "decided" ? DECIDED_STATUSES : VC_VISIBLE_STATUSES;

  return prisma.paymentRecommendation.findMany({
    where: { status: { in: statuses } },
    orderBy: [{ sentToVcAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      status: true,
      version: true,
      overallRecommendedPayment: true,
      sentToVcAt: true,
      submittedBy: { select: { name: true } },
      report: {
        select: {
          id: true,
          month: true,
          year: true,
          location: { select: { id: true, code: true, name: true } },
        },
      },
      vcApprovals: {
        orderBy: { decidedAt: "desc" },
        take: 1,
        select: { decision: true, decidedAt: true },
      },
    },
  });
}

export async function getVcRecommendation(
  prisma: Pick<PrismaClient, "paymentRecommendation">,
  actor: Actor,
  id: string,
) {
  assertViceChancellor(actor);
  const recommendation = await prisma.paymentRecommendation.findUnique({
    where: { id },
    select: {
      ...recommendationSelect,
      submittedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });

  // Drafts and GAA-only finalized recommendations were never sent to the VC.
  if (!recommendation || !VC_VISIBLE_STATUSES.includes(recommendation.status)) {
    return null;
  }

  return recommendation;
}

export async function decideVcRecommendation(
  prisma: Pick<PrismaClient, "paymentRecommendation" | "$transaction">,
  actor: Actor,
  recommendationId: string,
  decision: VCDecision,
  remarksInput: string,
) {
  assertViceChancellor(actor);

  if (!isVcDecision(decision)) {
    throw new PaymentRecommendationError("INVALID_CATEGORY", "Choose approve, reject or request clarification.");
  }

  const remarks = remarksInput.trim();
  if (decision !== "APPROVE" && !remarks) {
    throw new PaymentRecommendationError(
      "REMARKS_REQUIRED",
      decision === "REJECT"
        ? "Remarks are required when rejecting a recommendation."
        : "Describe what needs clarification.",
    );
  }

  const outcome = DECISION_OUTCOME[decision];

  return prisma.$transaction(async (tx) => {
    const recommendation = await tx.paymentRecommendation.findUnique({
      where: { id: recommendationId },
      select: {
        id: true,
        status: true,
        version: true,
        reportId: true,
        createdByUserId: true,
        submittedByUserId: true,
        report: {
          select: { status: true, month: true, year: true, location: { select: { name: true } } },
        },
      },
    });

    if (!recommendation) {
      throw new PaymentRecommendationError("NOT_FOUND", "Recommendation was not found.", 404);
    }

    if (recommendation.status !== "VC_PENDING") {
      throw new PaymentRecommendationError(
        "LOCKED",
        "Only recommendations pending Vice Chancellor review can be decided.",
        409,
      );
    }

    if (decision === "APPROVE" && recommendation.report.status !== "ADMIN_APPROVED") {
      throw new PaymentRecommendationError(
        "NOT_ELIGIBLE",
        "The underlying monthly report is no longer Administration-approved.",
        409,
      );
    }

    // Conditional update guards against two Vice Chancellors deciding at once.
    const updated = await tx.paymentRecommendation.update({
      where: { id: recommendationId, status: "VC_PENDING" },
      data: { status: outcome.status },
      select: { id: true, status: true, version: true },
    });

    const approval = await tx.vCApproval.create({
      data: {
        recommendationId,
        vcUserId: actor.id,
        decision,
        remarks: remarks || null,
      },
      select: { id: true, decision: true, remarks: true, decidedAt: true },
    });

    const period = `${recommendation.report.year}-${String(recommendation.report.month).padStart(2, "0")}`;
    const locationName = recommendation.report.location.name;

    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: outcome.action,
        entityType: "PaymentRecommendation",
        entityId: recommendationId,
        description: `Vice Chancellor ${outcome.verb} the ${locationName} payment recommendation for ${period}.`,
        metadata: {
          reportId: recommendation.reportId,
          decision,
          remarks: remarks || null,
          version: recommendation.version,
          vcApprovalId: approval.id,
        } as Prisma.InputJsonValue,
      },
    });

    const recipients = new Set(
      [recommendation.submittedByUserId, recommendation.createdByUserId].filter(
        (value): value is string => Boolean(value),
      ),
    );

    for (const recipientUserId of recipients) {
      await tx.notification.create({
        data: {
          recipientUserId,
          event: outcome.event,
          title: outcome.title,
          message: `The Vice Chancellor ${outcome.verb} the ${locationName} payment recommendation for ${period}.${
            remarks ? ` Remarks: ${remarks}` : ""
          }`,
          entityType: "PaymentRecommendation",
          entityId: recommendationId,
          dedupeKey: `vc-decision:${approval.id}:${recipientUserId}`,
          metadata: {
            recommendationId,
            reportId: recommendation.reportId,
            decision,
            status: outcome.status,
          } as Prisma.InputJsonValue,
        },
      });
    }

    return { ...updated, approval };
  });
}
