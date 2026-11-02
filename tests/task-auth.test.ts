import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, requireAuthenticatedUser, requireRole } from "@/lib/auth";

const supabaseState = {
  sessionUser: null as null | { id: string; email: string },
  appUser: null as null | {
    id: string;
    name: string;
    email: string;
    role: "DEPUTY_REGISTRAR" | "UNIT_OFFICER" | "PHI" | "SUB_WARDEN" | "CURATOR";
    active: boolean;
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: supabaseState.sessionUser },
        error: null,
      }),
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => supabaseState.appUser),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabaseState.sessionUser = null;
  supabaseState.appUser = null;
});

describe("task authorization", () => {
  it("allows an active Deputy Registrar", async () => {
    supabaseState.sessionUser = { id: "supabase-user-1", email: "dr@example.com" };
    supabaseState.appUser = {
      id: "supabase-user-1",
      name: "Deputy Registrar",
      email: "dr@example.com",
      role: "DEPUTY_REGISTRAR",
      active: true,
    };

    await expect(requireRole("DEPUTY_REGISTRAR")).resolves.toMatchObject({
      appUser: expect.objectContaining({
        role: "DEPUTY_REGISTRAR",
        active: true,
      }),
    });
  });

  it("rejects unauthenticated access", async () => {
    await expect(requireAuthenticatedUser()).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects inactive Deputy Registrars", async () => {
    supabaseState.sessionUser = { id: "supabase-user-1", email: "dr@example.com" };
    supabaseState.appUser = {
      id: "supabase-user-1",
      name: "Deputy Registrar",
      email: "dr@example.com",
      role: "DEPUTY_REGISTRAR",
      active: false,
    };

    await expect(requireRole("DEPUTY_REGISTRAR")).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("Your account is not active"),
    });
  });

  for (const role of [
    "UNIT_OFFICER",
    "PHI",
    "SUB_WARDEN",
    "CURATOR",
  ] as const) {
    it(`rejects ${role}`, async () => {
      supabaseState.sessionUser = { id: "supabase-user-1", email: "role@example.com" };
      supabaseState.appUser = {
        id: "supabase-user-1",
        name: "Role User",
        email: "role@example.com",
        role,
        active: true,
      };

      await expect(requireRole("DEPUTY_REGISTRAR")).rejects.toBeInstanceOf(AuthError);
      await expect(requireRole("DEPUTY_REGISTRAR")).rejects.toMatchObject({
        status: 403,
      });
    });
  }
});
