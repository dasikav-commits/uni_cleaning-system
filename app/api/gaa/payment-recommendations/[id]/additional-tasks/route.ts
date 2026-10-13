import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse, readJsonBody, stringField } from "@/lib/api-errors";
import { addAdditionalRecommendationTask, PaymentRecommendationError } from "@/lib/payment-recommendations";
import { prisma } from "@/lib/prisma";

const categories = ["DAILY", "WEEKLY", "MONTHLY"] as const;
type Category = (typeof categories)[number];

function amountField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const body = await readJsonBody(request);
    const category = stringField(body, "category").trim().toUpperCase();
    if (!categories.includes(category as Category)) {
      throw new PaymentRecommendationError("INVALID_CATEGORY", "Select a valid task category (DAILY, WEEKLY or MONTHLY).");
    }

    const task = await addAdditionalRecommendationTask(prisma, appUser, (await params).id, {
      taskName: stringField(body, "taskName"),
      category: category as Category,
      allocatedAmount: amountField(body, "allocatedAmount"),
      completionPercentage: amountField(body, "completionPercentage"),
      remark: stringField(body, "remark"),
    });
    return NextResponse.json(task);
  } catch (error) {
    return apiErrorResponse(error, "Unable to add task.");
  }
}
