"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { periodKey, periodLabel, recentPeriods, type Period } from "@/lib/periods";

/** Month selector that keeps the other query parameters (e.g. ?category=). */
export function PeriodPicker({ period, count = 13 }: { period: Period; count?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const options = recentPeriods(count);
  const current = periodKey(period);
  if (!options.some((option) => periodKey(option) === current)) options.push(period);

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 print:hidden">
      <span>Month</span>
      <select
        value={current}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("period", event.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
        className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={periodKey(option)} value={periodKey(option)}>
            {periodLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
