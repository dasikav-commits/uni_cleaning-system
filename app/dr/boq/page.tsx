import Link from "next/link";
import { AppShell } from "@/app/_components/app-shell";
import { Badge, Money, PageHeader } from "@/app/_components/ui";
import { locationCategoryLabels, type LocationCategoryKey } from "@/lib/application-roles";
import { getBoqOverview } from "@/lib/boq-management";
import { requirePageUser } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { BoqImportButton, NewLocationForm } from "./boq-actions";

export default async function DrBoqPage() {
  const appUser = await requirePageUser(["DEPUTY_REGISTRAR"]);
  const { locations, totalCents } = await getBoqOverview(prisma);

  return (
    <AppShell user={appUser}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          eyebrow="Set-up · Deputy Registrar"
          title="BOQ & locations"
          description={
            <>
              The Bill of Quantities of the Kuliyapitiya premises: each service, its items, frequencies and monthly amounts. Reports copy the BOQ when they are started, so changes apply to new
              reports (open reports offer to update). Monthly BOQ total of active locations: <strong>Rs. <Money cents={totalCents} dash={false} /></strong>.
            </>
          }
          actions={<BoqImportButton hasLocations={locations.length > 0} />}
        />

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">No.</th>
                  <th className="th">Location</th>
                  <th className="th">Category</th>
                  <th className="th">Format</th>
                  <th className="th text-right">Items</th>
                  <th className="th text-right">Monthly BOQ (Rs.)</th>
                  <th className="th">Reported by</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.length ? (
                  locations.map((location) => (
                    <tr key={location.id} className={location.active ? "" : "bg-slate-50 text-slate-400"}>
                      <td className="td">{location.boqNumber ?? "-"}</td>
                      <td className="td min-w-[14rem]">
                        <Link href={`/dr/boq/${location.id}`} className="font-semibold text-slate-900 hover:text-cyan-700">
                          {location.name}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {location.code}
                          {location.active ? "" : " · inactive"}
                        </p>
                        {location.warnings.map((warning) => (
                          <p key={warning.message} className="text-xs text-amber-700">
                            {warning.message}
                          </p>
                        ))}
                      </td>
                      <td className="td">{locationCategoryLabels[location.category as LocationCategoryKey] ?? location.category}</td>
                      <td className="td">
                        <Badge tone={location.evaluationFormat === "RATE_BASED" ? "amber" : "cyan"}>{location.evaluationFormat === "RATE_BASED" ? "Rate based" : "Tick format"}</Badge>
                      </td>
                      <td className="td text-right tabular-nums">{location.itemCount}</td>
                      <td className="td text-right">
                        <Money cents={location.boqCents} />
                      </td>
                      <td className="td text-xs">{location.reporters.length ? location.reporters.join(", ") : <span className="text-amber-700">Not assigned</span>}</td>
                      <td className="td text-right">
                        <Link href={`/dr/boq/${location.id}`} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="td py-10 text-center text-slate-500" colSpan={8}>
                      No locations yet. Use &quot;Load Kuliyapitiya BOQ&quot; to create the 28 services.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <NewLocationForm />
      </div>
    </AppShell>
  );
}
