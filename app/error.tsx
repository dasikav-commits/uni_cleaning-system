"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Fallback for unexpected errors in any page that has no closer error.tsx.
 * In production the message is hidden by Next.js; the digest matches the
 * server log entry.
 */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV !== "production";
  const schemaOutOfDate = /does not exist in the current database/i.test(error.message);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-red-50 p-8">
        <h1 className="text-2xl font-semibold text-red-950">Something went wrong loading this page.</h1>
        <p className="mt-2 text-sm text-red-800">
          Please try again. If the problem continues, contact the system administrator
          {error.digest ? (
            <>
              {" "}and mention reference <code className="rounded bg-red-100 px-1">{error.digest}</code>
            </>
          ) : null}
          .
        </p>
        {isDevelopment && schemaOutOfDate ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            The database is missing a table or column that the application expects. Run the scripts in{" "}
            <code>prisma/repair/</code> (see <code>prisma/repair/README.md</code>).
          </p>
        ) : null}
        {isDevelopment ? <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-red-900">{error.message}</pre> : null}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => retry()} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
            Try again
          </button>
          <Link href="/dashboard" className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
