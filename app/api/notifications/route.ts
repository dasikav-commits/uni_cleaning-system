import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { listNotifications, markAllNotificationsRead } from "@/lib/system-administration";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { appUser } = await requireAuthenticatedUser();
    const filter = new URL(request.url).searchParams.get("filter");
    return NextResponse.json({
      notifications: await listNotifications(prisma, appUser, filter === "read" || filter === "unread" ? filter : "all"),
    });
  } catch (error) {
    return apiErrorResponse(error, "Unable to load notifications.");
  }
}

export async function PATCH() {
  try {
    const { appUser } = await requireAuthenticatedUser();
    return NextResponse.json(await markAllNotificationsRead(prisma, appUser));
  } catch (error) {
    return apiErrorResponse(error, "Unable to update notifications.");
  }
}
