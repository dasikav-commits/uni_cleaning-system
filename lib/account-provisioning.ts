import type { PrismaClient, User, UserRole } from "@/app/generated/prisma/client";
import { isApplicationRole } from "@/lib/application-roles";

/**
 * Self-service accounts (public signup, or a Supabase Auth user that signs in
 * without an application profile) are never trusted with a role on their own:
 * the requested role is only recorded and the account stays inactive until the
 * Deputy Registrar reviews and activates it in User Management.
 *
 * Bootstrap exception: while the system has no active Deputy Registrar at all,
 * a DR request is granted immediately, otherwise nobody could approve anyone.
 */

/** Placeholder role for profiles created without a valid requested role. */
export const DEFAULT_PENDING_ROLE: UserRole = "UNIT_OFFICER";

// Arbitrary constant used to serialize the "is there an active DR yet?"
// check so two simultaneous first signups cannot both become DR.
const BOOTSTRAP_LOCK_KEY = 74_210_031;

export type ProvisionInput = {
  id: string;
  email: string;
  name: string;
  requestedRole?: unknown;
};

export type ProvisionResult = {
  user: User;
  /** True when the account was created inactive and needs DR approval. */
  pendingApproval: boolean;
  /** True when this account became the first active Deputy Registrar. */
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

    if (requestedRole === "DEPUTY_REGISTRAR") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`;
      const activeDrCount = await tx.user.count({ where: { role: "DEPUTY_REGISTRAR", active: true } });
      bootstrapAdmin = activeDrCount === 0;
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
