import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { InvalidRequestError, readJsonBody } from "@/lib/api-errors";
import { prisma } from "@/lib/prisma";
import { ensureTestUsers } from "@/prisma/ensure-test-users";
import { testUsers } from "@/prisma/test-users";

/**
 * Test accounts have well-known passwords (including a GAA account), so this
 * bootstrap endpoint is disabled in production unless explicitly enabled.
 */
function isTestUserInitEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_TEST_USER_INIT === "true";
}

function disabledResponse() {
  return NextResponse.json(
    {
      error: "Test user initialization is disabled in production.",
      message: "Set ALLOW_TEST_USER_INIT=true temporarily if you really need to create the test accounts.",
    },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  if (!isTestUserInitEnabled()) {
    return disabledResponse();
  }

  try {
    const body = (await readJsonBody(request)) as { serviceRoleKey?: unknown };
    const serviceRoleKey =
      typeof body.serviceRoleKey === "string" ? body.serviceRoleKey.trim() : "";

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Service Role Key is required",
          message: "Please provide the Supabase Service Role Key from your project settings",
        },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results = await ensureTestUsers(prisma, supabase);
    const success = results.every((result) => result.status === "success");

    return NextResponse.json(
      {
        success,
        message: success
          ? "All test users were verified in Supabase Auth and PostgreSQL."
          : "Some test users could not be initialized.",
        results,
        // Only returned to a caller that proved it holds the service role key.
        credentials: testUsers,
      },
      { status: success ? 200 : 500 },
    );
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Initialization error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  if (!isTestUserInitEnabled()) {
    return disabledResponse();
  }

  // Never expose passwords on this unauthenticated endpoint.
  return NextResponse.json({
    message: "Use POST to initialize test users",
    instructions: "Send a POST request with { serviceRoleKey: 'your-key' }",
    testUsers: testUsers.map(({ email, name, role }) => ({ email, name, role })),
  });
}
