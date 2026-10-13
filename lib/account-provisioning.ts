import type { PrismaClient, User, UserRole } from "@/app/generated/prisma/client";
import { isApplicationRole } from "@/lib/application-roles";

/**
 * Self-service accounts (public signup, or a Supabase Auth user that signs in
 * without an application profile) are never trusted with a role on their own:
 * the requested role is only recorded and the account stays inactive until a
 * GAA reviews and activates it in User Management.
 *
 * Bootstrap exception: while the system has no active GAA at all, a GAA
 * request is granted immediately, otherwise nobody could ever approve anyone.
 */

/** Placeholder role for profiles created without a valid requested role. */
export const DEFAULT_PENDING_ROLE: UserRole = "EVALUATING_OFFICER";

// Arbitrary constant used to serialize the "is there an active GAA yet?"
// check so two simultaneous first signups cannot both become GAA.
const BOOTSTRAP_LOCK_KEY = 74_210_031;

export type ProvisionInput = {
  id: string;
  email: string;
  name: string;
  requestedRole?: unknown;
};

export type ProvisionResult = {
  user: User;
  /** True when the account was created inactive and needs GAA approval. */
  pendingApproval: boolean;
  /** True when this account became the first active GAA. */
  bootstrapAdmin: boolean;
};

export async function provisionSelfServiceUser(
  prisma: Pick<PrismaClient, "$transaction">,
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const requestedRole =
    typeof input.requestedRole === "string" && isApplicationRole(input.requestedRole)
      ? input.requestedRole
      : null;

  return prisma.$transaction(async (tx) => {
    let bootstrapAdmin = false;

    if (requestedRole === "GAA") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`;
      const activeGaaCount = await tx.user.count({ where: { role: "GAA", active: true } });
      bootstrapAdmin = activeGaaCount === 0;
    }

    const user = await tx.user.create({
      data: {
        id: input.id,
        email: input.email,
        name: input.name,
        role: requestedRole ?? DEFAULT_PENDING_ROLE,
        active: bootstrapAdmin,
      },
    });

    return { user, pendingApproval: !bootstrapAdmin, bootstrapAdmin };
  });
}
