import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { provisionSelfServiceUser } from "@/lib/account-provisioning";
import { InvalidRequestError, readJsonBody } from "@/lib/api-errors";
import { isApplicationRole } from "@/lib/application-roles";

type SignupRequest = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const { email, password, name, role } = body as Partial<SignupRequest>;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof name !== "string" ||
      typeof role !== "string" ||
      !email.trim() ||
      !password ||
      !name.trim() ||
      !role.trim()
    ) {
      return NextResponse.json(
        { error: "Email, password, name, and role are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(name).trim();

    if (!isApplicationRole(role)) {
      return NextResponse.json({ error: "Select a valid role" }, { status: 400 });
    }

    if (!normalizedName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate password (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      serviceRoleKey === "your-service-role-key-here"
    ) {
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create the user in Supabase Auth (the password is hashed by Supabase).
    // The address is not confirmed yet: Supabase e-mails a verification link
    // below, and the Deputy Registrar must still approve the account.
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        name: normalizedName,
        role,
      },
    });

    if (error) {
      console.error("Supabase signup error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create account" },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    let provisioned: Awaited<ReturnType<typeof provisionSelfServiceUser>>;
    try {
      provisioned = await provisionSelfServiceUser(prisma, {
        id: data.user.id,
        email: normalizedEmail,
        name: normalizedName,
        requestedRole: role,
      });
    } catch (databaseError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      console.error("Database signup error:", databaseError);
      return NextResponse.json(
        { error: "Account could not be completed. Please try again." },
        { status: 500 }
      );
    }

    // Send the verification e-mail through Supabase Auth (uses the SMTP settings
    // of the Supabase project). A failure here must not undo the signup: the
    // user can ask for a new link from the sign-in page.
    let verificationSent = true;
    try {
      const origin = request.headers.get("origin") ?? new URL(request.url).origin;
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: { emailRedirectTo: `${origin}/login?verified=1` },
      });
      if (resendError) throw resendError;
    } catch (verificationError) {
      verificationSent = false;
      console.error("Signup verification e-mail failed", verificationError);
    }

    const verifyText = verificationSent
      ? " We have sent a verification link to your e-mail address - open it to confirm your address."
      : "";

    return NextResponse.json(
      {
        success: true,
        pendingApproval: provisioned.pendingApproval,
        verificationSent,
        message: provisioned.pendingApproval
          ? `Account created.${verifyText} The Deputy Registrar must approve your account before you can sign in.`
          : `Account created as the first Deputy Registrar.${verifyText} You can then sign in.`,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: provisioned.user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvalidRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
