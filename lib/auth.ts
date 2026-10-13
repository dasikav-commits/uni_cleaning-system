import type { User, UserRole } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const roleRedirectPath: Record<UserRole, string> = {
  GAA: "/dashboard/gaa",
  EVALUATING_OFFICER: "/dashboard/evaluating-officer",
  PHI: "/dashboard/phi",
  ADMINISTRATION_OFFICER: "/dashboard/administration",
  VICE_CHANCELLOR: "/dashboard/vice-chancellor",
};

export type AuthContext = {
  sessionUser: Awaited<ReturnType<typeof getSupabaseUser>>;
  /** The application user, only when the account is active. */
  appUser: User | null;
  /**
   * Set instead of `appUser` when the account exists but is inactive (for
   * example a self-signup still waiting for GAA approval). Keeping inactive
   * users out of `appUser` means every page that checks `appUser` denies them.
   */
  inactiveUser?: User | null;
};

export const INACTIVE_ACCOUNT_MESSAGE =
  "Your account is not active. If you just signed up, a GAA administrator must approve your account before you can sign in.";

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 403, code = status === 401 ? "UNAUTHORIZED" : "ACCESS_DENIED") {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user ?? null;
}

export async function getApplicationUserBySupabaseId(supabaseUserId: string) {
  return prisma.user.findUnique({
    where: {
      id: supabaseUserId,
    },
  });
}

export async function getAuthContext(): Promise<AuthContext> {
  const sessionUser = await getSupabaseUser();

  if (!sessionUser) {
    return { sessionUser: null, appUser: null };
  }

  const appUser = await getApplicationUserBySupabaseId(sessionUser.id);

  if (appUser && !appUser.active) {
    return { sessionUser, appUser: null, inactiveUser: appUser };
  }

  return { sessionUser, appUser };
}

export async function requireAuthenticatedUser() {
  const { sessionUser, appUser, inactiveUser } = await getAuthContext();

  if (!sessionUser) {
    throw new AuthError("Unauthorized", 401);
  }

  if (inactiveUser) {
    throw new AuthError(INACTIVE_ACCOUNT_MESSAGE, 403, "ACCOUNT_INACTIVE");
  }

  if (!appUser) {
    throw new AuthError(
      "You are authenticated in Supabase, but no application user record was found.",
      403,
    );
  }

  if (!appUser.active) {
    throw new AuthError(INACTIVE_ACCOUNT_MESSAGE, 403, "ACCOUNT_INACTIVE");
  }

  return { sessionUser, appUser };
}

export async function requireRole(requiredRole: UserRole) {
  const { sessionUser, appUser } = await requireAuthenticatedUser();

  if (appUser.role !== requiredRole) {
    throw new AuthError("You do not have permission to perform this action.", 403);
  }

  return { sessionUser, appUser };
}
