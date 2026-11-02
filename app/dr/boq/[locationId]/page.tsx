import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/_components/app-shell";
import { Money, PageHeader } from "@/app/_components/ui";
import { getLocationBoq } from "@/lib/boq-management";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { LocationBoqEditor } from "./location-boq-editor";

export default async function LocationBoqPage({ params }: PageProps<"/dr/boq/[locationId]">) {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const { locationId } = await params;
  const location = await getLocationBoq(prisma, locationId);
  if (!location) notFound();

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Link href="/dr/boq" className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
          &larr; BOQ &amp; locations
        </Link>
        <PageHeader
          eyebrow={`${location.code}${location.boqNumber ? ` · BOQ ${location.boqNumber}` : ""}`}
          title={location.name}
          description={
            <>
              Monthly amount as per the BOQ: <strong>Rs. <Money cents={location.boqCents} dash={false} /></strong>
              {location.boqAmount !== null ? " (fixed amount)" : " (sum of the items)"}.
            </>
          }
        />
        {location.warnings.length ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {location.warnings.map((warning) => (
              <p key={warning.message}>{warning.message}</p>
            ))}
          </div>
        ) : null}
        <LocationBoqEditor key={JSON.stringify(location.boqItems.map((item) => [item.id, item.active, item.monthlyAmount]))} location={JSON.parse(JSON.stringify(location))} />
      </div>
    </AppShell>
  );
}
