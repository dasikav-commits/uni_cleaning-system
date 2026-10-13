import { NextResponse } from "next/server";
import { ActivityAction, type UserRole } from "@/app/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { isApplicationRole } from "@/lib/application-roles";
import { listAuditLogs } from "@/lib/system-administration";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { appUser } = await requireRole("GAA");
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const action = url.searchParams.get("action");
    return NextResponse.json(
      await listAuditLogs(prisma, appUser, {
        query: url.searchParams.get("query") ?? undefined,
        userId: url.searchParams.get("userId") ?? undefined,
        role: role && isApplicationRole(role) ? (role as UserRole) : undefined,
        action: action && Object.values(ActivityAction).includes(action as ActivityAction) ? action : undefined,
        page: Number(url.searchParams.get("page")) || 1,
      }),
    );
  } catch (error) {
    return apiErrorResponse(error, "Unable to load audit logs.");
  }
}
