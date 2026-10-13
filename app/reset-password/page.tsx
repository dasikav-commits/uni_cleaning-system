"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LinkState = "checking" | "ready" | "invalid";

/** Supabase reports failed/expired recovery links via `error_description` in the query or the hash. */
function readLinkError() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const description = query.get("error_description") ?? hash.get("error_description");
  const code = query.get("error_code") ?? hash.get("error_code");
  if (code === "otp_expired") return "This password reset link has expired.";
  return description ? description.replace(/\+/g, " ") : null;
}

function describeUpdateError(error: { code?: string; message?: string }) {
  if (error.code === "same_password") return "Choose a password that is different from your current one.";
  if (error.code === "weak_password") return error.message || "That password is too weak. Choose a stronger one.";
  if (error.code === "session_not_found" || error.code === "session_expired") {
    return "Your reset session has expired. Request a new reset link.";
  }
  return "We couldn't update your password right now. Please try again.";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkRecoverySession() {
      try {
        // getSession() waits until the client has exchanged the `?code=` from the
        // email link (PKCE) for a recovery session.
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session) {
          // Drop the one-time code / tokens from the address bar.
          window.history.replaceState(null, "", window.location.pathname);
          setLinkState("ready");
          return;
        }

        setLinkError(
          readLinkError() ??
            "This reset link is invalid or has already been used. Open the latest link from your email in the same browser you requested it from, or request a new one.",
        );
        setLinkState("invalid");
      } catch {
        if (cancelled) return;
        setLinkError("We couldn't verify your reset link. Check your connection and try again.");
        setLinkState("invalid");
      }
    }

    void checkRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!password) {
      setError("New password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(describeUpdateError(updateError));
        return;
      }

      // Sign out the recovery session everywhere so the new password must be used.
      await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
      router.replace("/login?reset=success");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center">
        <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            University Cleaning Monitoring System
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Reset password</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Enter a new password for your account to complete the recovery process.
          </p>

          {linkState === "checking" ? (
            <p className="mt-6 text-sm text-slate-600">Verifying your reset link...</p>
          ) : null}

          {linkState === "invalid" ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{linkError}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Back to sign in
                </Link>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Request a new link
                </Link>
              </div>
            </div>
          ) : null}

          {linkState === "ready" ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                Back to sign in
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
