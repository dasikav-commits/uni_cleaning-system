import { redirect } from "next/navigation";
import type { UserRole } from "@/app/generated/prisma/client";
import { getAuthContext, roleRedirectPath } from "@/lib/auth";

/**
 * For server pages: returns the active application user, sending everyone
 * else to the right place (sign-in, the approval notice, or their own home).
 */
export async function requirePageUser(roles?: readonly UserRole[]) {
  const { sessionUser, appUser } = await getAuthContext();
  if (!sessionUser) redirect("/login");
  if (!appUser) redirect("/dashboard");
  if (roles && !roles.includes(appUser.role)) redirect(roleRedirectPath[appUser.role]);
  return appUser;
}
