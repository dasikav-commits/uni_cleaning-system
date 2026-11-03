"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { locationCategories, locationCategoryLabels } from "@/lib/application-roles";
import { formatMoney, frequencyLabels, toCents } from "@/lib/evaluation-calc";
import type { getLocationBoq } from "@/lib/boq-management";
import { sendJson } from "../boq-actions";

type LocationView = NonNullable<Awaited<ReturnType<typeof getLocationBoq>>>;
type Item = LocationView["boqItems"][number];

const frequencies = Object.keys(frequencyLabels) as (keyof typeof frequencyLabels)[];

type ItemForm = {
  itemNo: string;
  subItem: string;
  description: string;
  frequency: string;
  monthlyAmount: string;
  unitRate: string;
  unitLabel: string;
  plannedPerYear: string;
  penaltyRate: string;
  details: string;
  sortOrder: string;
};

function itemForm(item?: Item): ItemForm {
  return {
    itemNo: item?.itemNo ?? "",
    subItem: item?.subItem ?? "",
    description: item?.description ?? "",
    frequency: item?.frequency ?? "DAILY",
    monthlyAmount: item?.monthlyAmount ?? "0",
    unitRate: item?.unitRate ?? "",
    unitLabel: item?.unitLabel ?? "",
    plannedPerYear: item?.plannedPerYear === null || item?.plannedPerYear === undefined ? "" : String(item.plannedPerYear),
    penaltyRate: item?.penaltyRate ?? "",
    details: item?.details ?? "",
    sortOrder: item ? String(item.sortOrder) : "",
  };
}

export function LocationBoqEditor({ location }: { location: LocationView }) {
  const router = useRouter();
  const rateBased = location.evaluationFormat === "RATE_BASED";
  const [loc, setLoc] = useState({
    name: location.name,
    shortName: location.shortName ?? "",
    boqDescription: location.boqDescription ?? "",
    boqNumber: location.boqNumber === null ? "" : String(location.boqNumber),
    category: location.category,
    evaluationFormat: location.evaluationFormat,
    boqAmount: location.boqAmount ?? "",
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(itemForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      setEditing(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const itemFields = (
    <div className="grid gap-3 md:grid-cols-6">
      <label>
        <span className="label">Item no.</span>
        <input value={form.itemNo} onChange={(event) => setForm({ ...form, itemNo: event.target.value })} className="control" />
      </label>
      <label>
        <span className="label">Sub item</span>
        <input value={form.subItem} onChange={(event) => setForm({ ...form, subItem: event.target.value })} className="control" />
      </label>
      <label className="md:col-span-4">
        <span className="label">Description</span>
        <input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="control" />
      </label>
      <label className="md:col-span-2">
        <span className="label">Frequency</span>
        <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="control">
          {frequencies.map((value) => (
            <option key={value} value={value}>
              {frequencyLabels[value]}
            </option>
          ))}
        </select>
      </label>
      {rateBased ? (
        <>
          <label>
            <span className="label">Rate (Rs.)</span>
            <input value={form.unitRate} onChange={(event) => setForm({ ...form, unitRate: event.target.value })} className="control" inputMode="decimal" />
          </label>
          <label>
            <span className="label">Unit</span>
            <input value={form.unitLabel} onChange={(event) => setForm({ ...form, unitLabel: event.target.value })} className="control" placeholder="pit" />
          </label>
          <label>
            <span className="label">Planned / year</span>
            <input value={form.plannedPerYear} onChange={(event) => setForm({ ...form, plannedPerYear: event.target.value })} className="control" inputMode="numeric" />
          </label>
          <label>
            <span className="label">Fine per unit (Rs.)</span>
            <input value={form.penaltyRate} onChange={(event) => setForm({ ...form, penaltyRate: event.target.value })} className="control" inputMode="decimal" />
          </label>
        </>
      ) : (
        <label className="md:col-span-2">
          <span className="label">Monthly amount (Rs.)</span>
          <input value={form.monthlyAmount} onChange={(event) => setForm({ ...form, monthlyAmount: event.target.value })} className="control" inputMode="decimal" />
        </label>
      )}
      <label className={rateBased ? "md:col-span-5" : "md:col-span-1"}>
        <span className="label">Details</span>
        <input value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} className="control" />
      </label>
      <label>
        <span className="label">Order</span>
        <input value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="control" inputMode="numeric" />
      </label>
    </div>
  );

  return (
    <>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}

      <form
        className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => sendJson(`/api/dr/locations/${location.id}`, "PATCH", loc), "Location saved.");
        }}
      >
        <h2 className="text-base font-semibold text-slate-950 md:col-span-4">Location</h2>
        <label className="md:col-span-2">
          <span className="label">Name</span>
          <input required value={loc.name} onChange={(event) => setLoc({ ...loc, name: event.target.value })} className="control" />
        </label>
        <label>
          <span className="label">Short name</span>
          <input value={loc.shortName} onChange={(event) => setLoc({ ...loc, shortName: event.target.value })} className="control" />
        </label>
        <label>
          <span className="label">BOQ number</span>
          <input value={loc.boqNumber} onChange={(event) => setLoc({ ...loc, boqNumber: event.target.value })} className="control" inputMode="numeric" />
        </label>
        <label className="md:col-span-2">
          <span className="label">Description in the payment report</span>
          <input value={loc.boqDescription} onChange={(event) => setLoc({ ...loc, boqDescription: event.target.value })} className="control" />
        </label>
        <label>
          <span className="label">Category</span>
          <select value={loc.category} onChange={(event) => setLoc({ ...loc, category: event.target.value as typeof loc.category })} className="control">
            {locationCategories.map((category) => (
              <option key={category} value={category}>
                {locationCategoryLabels[category]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Report format</span>
          <select value={loc.evaluationFormat} onChange={(event) => setLoc({ ...loc, evaluationFormat: event.target.value as typeof loc.evaluationFormat })} className="control">
            <option value="SCHEDULED">Tick format</option>
            <option value="RATE_BASED">Rate based</option>
          </select>
        </label>
        <label>
          <span className="label">Fixed BOQ amount</span>
          <input value={loc.boqAmount} onChange={(event) => setLoc({ ...loc, boqAmount: event.target.value })} className="control" inputMode="decimal" placeholder="Sum of items" />
        </label>
        <div className="flex flex-wrap items-end gap-3 md:col-span-3">
          <button type="submit" disabled={busy} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            Save location
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                () => sendJson(`/api/dr/locations/${location.id}`, "PATCH", { ...loc, active: !location.active }),
                location.active ? "Location deactivated." : "Location activated.",
              )
            }
            className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold ${location.active ? "border-red-300 text-red-700 hover:bg-red-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
          >
            {location.active ? "Deactivate location" : "Activate location"}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">BOQ items</h2>
          {!rateBased ? <p className="text-sm text-slate-600">Sum of active items: Rs. {formatMoney(location.itemsCents, { dashForZero: false })}</p> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Item</th>
                <th className="th">Description</th>
                <th className="th">Frequency</th>
                <th className="th text-right">{rateBased ? "Rate" : "Monthly amount"}</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {location.boqItems.map((item) =>
                editing === item.id ? (
                  <tr key={item.id} className="bg-cyan-50/50">
                    <td className="td" colSpan={5}>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void run(() => sendJson(`/api/dr/boq-items/${item.id}`, "PATCH", form), "Item saved.");
                        }}
                        className="flex flex-col gap-3"
                      >
                        {itemFields}
                        <div className="flex gap-3">
                          <button type="submit" disabled={busy} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                            Save item
                          </button>
                          <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className={item.active ? "" : "bg-slate-50 text-slate-400 line-through"}>
                    <td className="td whitespace-nowrap">
                      {item.itemNo}
                      {item.subItem ? ` ${item.subItem}` : ""}
                    </td>
                    <td className="td">
                      {item.description}
                      {item.details ? <span className="block text-xs text-slate-500">{item.details}</span> : null}
                    </td>
                    <td className="td whitespace-nowrap">{frequencyLabels[item.frequency]}</td>
                    <td className="td whitespace-nowrap text-right tabular-nums">
                      {rateBased ? (
                        item.unitRate === null ? (
                          <span className="text-amber-700">not set</span>
                        ) : (
                          <>
                            {formatMoney(toCents(item.unitRate))} / {item.unitLabel ?? "unit"}
                            {item.plannedPerYear ? <span className="block text-xs text-slate-500">{item.plannedPerYear} per year</span> : null}
                          </>
                        )
                      ) : (
                        formatMoney(toCents(item.monthlyAmount))
                      )}
                    </td>
                    <td className="td whitespace-nowrap text-right">
                      {item.active ? (
                        <button
                          type="button"
                          onClick={() => {
                            setForm(itemForm(item));
                            setEditing(item.id);
                          }}
                          className="mr-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => sendJson(`/api/dr/boq-items/${item.id}`, "PATCH", { active: !item.active }), item.active ? "Item retired." : "Item restored.")}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50"
                      >
                        {item.active ? "Retire" : "Restore"}
                      </button>
                    </td>
                  </tr>
                ),
              )}
              {!location.boqItems.length ? (
                <tr>
                  <td className="td py-8 text-center text-slate-500" colSpan={5}>
                    No items yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 p-6">
          {editing === "new" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => sendJson(`/api/dr/locations/${location.id}/items`, "POST", form), "Item added.");
              }}
              className="flex flex-col gap-3"
            >
              <h3 className="text-sm font-semibold text-slate-900">New item</h3>
              {itemFields}
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                  Add item
                </button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setForm(itemForm());
                setEditing("new");
              }}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Add item
            </button>
          )}
        </div>
      </section>
    </>
  );
}
