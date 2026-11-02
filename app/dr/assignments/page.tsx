import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { PageHeader } from "@/app/_components/ui";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { listAssignmentBoard } from "@/lib/reporting-assignments";
import { AssignmentBoard } from "./assignment-board";

export default async function DrAssignmentsPage() {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const board = await listAssignmentBoard(prisma);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          eyebrow="Set-up · Deputy Registrar"
          title="Report assignments"
          description={
            <>
              Choose the login that fills in and sends the evaluation report of each location. A login only sees the locations assigned to it. Create the logins on the{" "}
              <Link href="/dr/users" className="font-semibold text-cyan-700">
                Users
              </Link>{" "}
              page first.
            </>
          }
        />
        <AssignmentBoard locations={board.locations} users={board.users} />
      </div>
    </AppShell>
  );
}
