import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { AppShell } from "@/app/_components/app-shell";
import { prisma } from "@/lib/prisma";
import { listManagedUsers } from "@/lib/user-management";
import { UserManagementClient } from "./user-management-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function DrUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { sessionUser, appUser } = await getAuthContext();
  const params = await searchParams;

  if (!sessionUser) {
    redirect("/login");
  }

  if (!appUser || appUser.role !== "DEPUTY_REGISTRAR") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
        <div className="max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
          <h1 className="text-3xl font-semibold text-white">Deputy Registrar only</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Only the Deputy Registrar can manage logins.
          </p>
        </div>
      </main>
    );
  }

  const query = firstString(params.query) ?? "";
  const role = firstString(params.role) ?? "";
  const status = firstString(params.status) ?? "";
  const page = Number(firstString(params.page) ?? "1");
  const pageSize = Number(firstString(params.pageSize) ?? "10");
  const sortBy = firstString(params.sortBy) ?? "createdAt";
  const sortOrder = firstString(params.sortOrder) ?? "desc";

  const data = await listManagedUsers(prisma, {
    query,
    role,
    status,
    page: Number.isNaN(page) ? 1 : page,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
    sortBy:
      sortBy === "name" ||
      sortBy === "email" ||
      sortBy === "role" ||
      sortBy === "active" ||
      sortBy === "createdAt"
        ? sortBy
        : "createdAt",
    sortOrder: sortOrder === "asc" ? "asc" : "desc",
  });

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Logins
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                Manage logins
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Create a login for every report sender (faculty coordinators, sub-wardens, the curator,
                unit officers and the PHI). Passwords are stored hashed by Supabase Auth; the e-mail
                address is the sign-in name and cannot be changed here. After creating a login, assign
                its locations so it sees only its own reports.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dr/assignments"
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Assign locations
              </Link>
            </div>
          </div>
        </section>

        <UserManagementClient
          initialData={data}
          currentFilters={{
            query,
            role,
            status,
            page: Number.isNaN(page) ? 1 : page,
            pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
            sortBy:
              sortBy === "name" ||
              sortBy === "email" ||
              sortBy === "role" ||
              sortBy === "active" ||
              sortBy === "createdAt"
                ? sortBy
                : "createdAt",
            sortOrder: sortOrder === "asc" ? "asc" : "desc",
          }}
        />
      </div>
    </AppShell>
  );
}
