import { NextResponse } from "next/server";
import { getAuthContext, INACTIVE_ACCOUNT_MESSAGE, roleRedirectPath } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionSelfServiceUser } from "@/lib/account-provisioning";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";

async function completeApplicationSession(sessionUser: SupabaseUser) {
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  // If user doesn't exist in app database, create them
  let user = appUser;
  if (!user) {
    try {
      // Never grant access automatically: user_metadata is editable by the
      // user, so the profile is created inactive and must be approved by a
      // GAA (except the very first GAA, see provisionSelfServiceUser).
      const metadataName = sessionUser.user_metadata?.name;
      ({ user } = await provisionSelfServiceUser(prisma, {
        id: sessionUser.id,
        email: (sessionUser.email || "").toLowerCase(),
        name:
          (typeof metadataName === "string" && metadataName.trim()) ||
          sessionUser.email?.split("@")[0] ||
          "User",
        requestedRole: sessionUser.user_metadata?.role,
      }));
    } catch (error: unknown) {
      // User might already exist if there's a race condition
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : undefined;

      if (errorCode === "P2002") {
        const existingUser = await prisma.user.findUnique({
          where: { id: sessionUser.id },
        });
        if (existingUser) {
          user = existingUser;
        } else {
          return NextResponse.json(
            { error: "Failed to set up your account." },
            { status: 500 },
          );
        }
      } else {
        console.error("Error creating user:", error);
        return NextResponse.json(
          { error: "Failed to set up your account." },
          { status: 500 },
        );
      }
    }
  }

  if (!user.active) {
    return NextResponse.json(
      { error: INACTIVE_ACCOUNT_MESSAGE, code: "ACCOUNT_INACTIVE" },
      { status: 403 },
    );
  }

  const redirectTo = roleRedirectPath[user.role];
  if (!redirectTo) {
    return NextResponse.json(
      { error: "Your account is not authorized for this system." },
      { status: 403 },
    );
  }

  return NextResponse.json({
    redirectTo,
    user: {
      name: user.name,
      role: user.role,
      email: user.email,
    },
  });
}

export async function GET() {
  const { sessionUser } = await getAuthContext();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return completeApplicationSession(sessionUser);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: unknown;
    refreshToken?: unknown;
  };

  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.user) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      const detail =
        process.env.NODE_ENV !== "production"
          ? ` ${error?.message ?? userError?.message ?? "Session could not be verified."}`
          : "";

      return NextResponse.json({ error: `Unauthorized.${detail}` }, { status: 401 });
    }

    return completeApplicationSession(user);
  }

  return completeApplicationSession(data.user);
}
