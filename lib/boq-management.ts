import type { BoqFrequency, EvaluationFormat, LocationCategory, Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { isLocationCategory } from "@/lib/application-roles";
import { KULIYAPITIYA_BOQ, type CatalogItem } from "@/lib/boq-catalog";
import { centsToDecimalString, isBoqFrequency, plannedMonthlyCents, toCents } from "@/lib/evaluation-calc";
import { locationBoqCents } from "@/lib/evaluation-reports";
import { assertDeputyRegistrar, type Actor } from "@/lib/reporting-assignments";

export class BoqManagementError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "BoqManagementError";
    this.code = code;
    this.status = status;
  }
}

type Db = Pick<PrismaClient, "$transaction" | "location" | "boqItem" | "activityLog">;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function text(value: unknown, name: string, { required = false, max = 500 } = {}) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new BoqManagementError("INVALID_VALUE", `${name} is required.`);
  if (result.length > max) throw new BoqManagementError("INVALID_VALUE", `${name} is too long (max ${max} characters).`);
  return result;
}

function money(value: unknown, name: string): string {
  const cents = toCents(value);
  if (!Number.isFinite(cents) || cents < 0) throw new BoqManagementError("INVALID_VALUE", `${name} must be an amount of 0 or more.`);
  if (cents > 99_999_999_999_99) throw new BoqManagementError("INVALID_VALUE", `${name} is too large.`);
  return centsToDecimalString(cents);
}

function optionalMoney(value: unknown, name: string): string | null {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  return money(value, name);
}

function optionalInt(value: unknown, name: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) throw new BoqManagementError("INVALID_VALUE", `${name} must be a whole number.`);
  return parsed;
}

function frequency(value: unknown): BoqFrequency {
  if (typeof value !== "string" || !isBoqFrequency(value)) throw new BoqManagementError("INVALID_VALUE", "Select a valid frequency.");
  return value;
}

function category(value: unknown): LocationCategory {
  if (typeof value !== "string" || !isLocationCategory(value)) throw new BoqManagementError("INVALID_VALUE", "Select a valid category.");
  return value;
}

function evaluationFormat(value: unknown): EvaluationFormat {
  if (value !== "SCHEDULED" && value !== "RATE_BASED") throw new BoqManagementError("INVALID_VALUE", "Select a valid report format.");
  return value;
}

function uniqueViolation(error: unknown, message: string): never {
  if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
    throw new BoqManagementError("DUPLICATE", message, 409);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type BoqWarning = { level: "warning" | "info"; message: string };

function warningsFor(location: {
  evaluationFormat: EvaluationFormat;
  boqAmount: Prisma.Decimal | null;
  items: { monthlyAmount: Prisma.Decimal; unitRate: Prisma.Decimal | null; description: string }[];
}): BoqWarning[] {
  const warnings: BoqWarning[] = [];
  if (!location.items.length) warnings.push({ level: "warning", message: "No BOQ items - reports cannot be started." });
  if (location.evaluationFormat === "RATE_BASED") {
    const missing = location.items.filter((item) => item.unitRate === null).length;
    if (missing) warnings.push({ level: "warning", message: `Rate not set for ${missing} item${missing === 1 ? "" : "s"}.` });
  } else {
    const itemsCents = location.items.reduce((sum, item) => sum + toCents(item.monthlyAmount), 0);
    if (location.boqAmount !== null && itemsCents !== toCents(location.boqAmount)) {
      warnings.push({
        level: "warning",
        message: `Item amounts add up to Rs. ${centsToDecimalString(itemsCents)} but the BOQ amount is Rs. ${centsToDecimalString(toCents(location.boqAmount))}.`,
      });
    }
  }
  return warnings;
}

export async function getBoqOverview(db: Pick<PrismaClient, "location">) {
  const locations = await db.location.findMany({
    orderBy: [{ active: "desc" }, { boqNumber: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      boqNumber: true,
      category: true,
      evaluationFormat: true,
      boqAmount: true,
      active: true,
      boqItems: { where: { active: true }, select: { monthlyAmount: true, unitRate: true, description: true } },
      reportingAssignments: { where: { active: true, user: { active: true } }, select: { user: { select: { name: true } } } },
    },
  });

  const rows = locations.map((location) => ({
    id: location.id,
    code: location.code,
    name: location.name,
    shortName: location.shortName,
    boqNumber: location.boqNumber,
    category: location.category,
    evaluationFormat: location.evaluationFormat,
    active: location.active,
    itemCount: location.boqItems.length,
    boqCents: locationBoqCents(location, location.boqItems),
    reporters: location.reportingAssignments.map((assignment) => assignment.user.name),
    warnings: warningsFor({ ...location, items: location.boqItems }),
  }));

  return { locations: rows, totalCents: rows.filter((row) => row.active).reduce((sum, row) => sum + row.boqCents, 0) };
}

export async function getLocationBoq(db: Pick<PrismaClient, "location">, locationId: string) {
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      boqNumber: true,
      boqDescription: true,
      category: true,
      evaluationFormat: true,
      boqAmount: true,
      active: true,
      boqItems: {
        orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          itemNo: true,
          subItem: true,
          description: true,
          frequency: true,
          monthlyAmount: true,
          unitRate: true,
          unitLabel: true,
          plannedPerYear: true,
          penaltyRate: true,
          details: true,
          sortOrder: true,
          active: true,
        },
      },
    },
  });
  if (!location) return null;
  const activeItems = location.boqItems.filter((item) => item.active);
  return {
    ...location,
    boqAmount: location.boqAmount === null ? null : centsToDecimalString(toCents(location.boqAmount)),
    boqCents: locationBoqCents(location, activeItems),
    itemsCents: activeItems.reduce((sum, item) => sum + toCents(item.monthlyAmount), 0),
    warnings: warningsFor({ ...location, items: activeItems }),
    boqItems: location.boqItems.map((item) => ({
      ...item,
      monthlyAmount: centsToDecimalString(toCents(item.monthlyAmount)),
      unitRate: item.unitRate === null ? null : centsToDecimalString(toCents(item.unitRate)),
      penaltyRate: item.penaltyRate === null ? null : centsToDecimalString(toCents(item.penaltyRate)),
      plannedMonthlyCents: plannedMonthlyCents(item.unitRate === null ? null : toCents(item.unitRate), item.plannedPerYear),
    })),
  };
}

// ---------------------------------------------------------------------------
// Import the Kuliyapitiya BOQ
// ---------------------------------------------------------------------------

function itemData(item: CatalogItem, locationId: string, sortOrder: number): Prisma.BoqItemCreateManyInput {
  return {
    locationId,
    itemNo: item.itemNo,
    subItem: item.subItem,
    description: item.description,
    frequency: item.frequency,
    monthlyAmount: item.monthlyAmount,
    unitRate: item.unitRate ?? null,
    unitLabel: item.unitLabel ?? null,
    plannedPerYear: item.plannedPerYear ?? null,
    penaltyRate: item.penaltyRate ?? null,
    details: item.details ?? null,
    sortOrder,
  };
}

export type BoqImportSummary = {
  locationsCreated: number;
  locationsUpdated: number;
  itemsCreated: number;
  locationsWithExistingItems: string[];
};

/**
 * Creates or updates the 28 Kuliyapitiya services. Safe to run more than once:
 * locations are matched by code, BOQ number or name, and items are only added
 * to locations that have none - unless `replaceItems` is set, which retires the
 * current items and loads the BOQ items again. Reports that were already
 * started keep their own copy of the rows.
 */
export async function importKuliyapitiyaBoq(db: Db, actor: Actor, options: { replaceItems?: boolean } = {}): Promise<BoqImportSummary> {
  assertDeputyRegistrar(actor);
  const summary: BoqImportSummary = { locationsCreated: 0, locationsUpdated: 0, itemsCreated: 0, locationsWithExistingItems: [] };

  await db.$transaction(
    async (tx) => {
      const existing = await tx.location.findMany({ select: { id: true, code: true, name: true, boqNumber: true } });
      const byCode = new Map(existing.map((location) => [location.code.toLowerCase(), location]));
      const byNumber = new Map(existing.filter((location) => location.boqNumber !== null).map((location) => [location.boqNumber, location]));
      const byName = new Map(existing.map((location) => [location.name.trim().toLowerCase(), location]));
      const usedCodes = new Set(existing.map((location) => location.code.toLowerCase()));

      for (const entry of KULIYAPITIYA_BOQ) {
        const match =
          byCode.get(entry.code.toLowerCase()) ??
          byNumber.get(entry.boqNumber) ??
          byName.get(entry.name.toLowerCase()) ??
          byName.get(entry.shortName.toLowerCase());

        const data = {
          name: entry.name,
          shortName: entry.shortName,
          boqNumber: entry.boqNumber,
          boqDescription: entry.boqDescription,
          category: entry.category,
          evaluationFormat: entry.evaluationFormat,
          boqAmount: entry.boqAmount ?? null,
          active: true,
        };

        let locationId: string;
        if (match) {
          // Free the BOQ number if another (older) location holds it.
          const holder = byNumber.get(entry.boqNumber);
          if (holder && holder.id !== match.id) {
            await tx.location.update({ where: { id: holder.id }, data: { boqNumber: null } });
            byNumber.delete(entry.boqNumber);
          }
          const codeFree = !usedCodes.has(entry.code.toLowerCase()) || match.code.toLowerCase() === entry.code.toLowerCase();
          await tx.location.update({ where: { id: match.id }, data: { ...data, ...(codeFree ? { code: entry.code } : {}) } });
          if (codeFree) usedCodes.add(entry.code.toLowerCase());
          byNumber.set(entry.boqNumber, match);
          locationId = match.id;
          summary.locationsUpdated += 1;
        } else {
          const holder = byNumber.get(entry.boqNumber);
          if (holder) await tx.location.update({ where: { id: holder.id }, data: { boqNumber: null } });
          const created = await tx.location.create({ data: { code: entry.code, ...data }, select: { id: true, code: true, name: true, boqNumber: true } });
          usedCodes.add(entry.code.toLowerCase());
          byNumber.set(entry.boqNumber, created);
          locationId = created.id;
          summary.locationsCreated += 1;
        }

        const activeItems = await tx.boqItem.count({ where: { locationId, active: true } });
        if (activeItems && !options.replaceItems) {
          summary.locationsWithExistingItems.push(entry.name);
          continue;
        }
        if (activeItems) await tx.boqItem.updateMany({ where: { locationId, active: true }, data: { active: false } });
        await tx.boqItem.createMany({ data: entry.items.map((item, index) => itemData(item, locationId, (index + 1) * 10)) });
        summary.itemsCreated += entry.items.length;
      }

      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "BOQ_IMPORTED",
          entityType: "Location",
          entityId: "kuliyapitiya",
          description: `Imported the Kuliyapitiya BOQ (${summary.locationsCreated} locations created, ${summary.locationsUpdated} updated, ${summary.itemsCreated} items added).`,
          metadata: { ...summary, replaceItems: Boolean(options.replaceItems) } as Prisma.InputJsonValue,
        },
      });
    },
    // Several hundred rows over a remote connection: allow more than the 5 s default.
    { timeout: 120_000, maxWait: 20_000 },
  );

  return summary;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export type LocationInput = Record<string, unknown>;

function locationData(input: LocationInput) {
  return {
    name: text(input.name, "Name", { required: true, max: 200 }),
    shortName: text(input.shortName, "Short name", { max: 80 }) || null,
    boqDescription: text(input.boqDescription, "Description in the payment report", { max: 300 }) || null,
    boqNumber: optionalInt(input.boqNumber, "BOQ number"),
    category: category(input.category),
    evaluationFormat: evaluationFormat(input.evaluationFormat ?? "SCHEDULED"),
    boqAmount: optionalMoney(input.boqAmount, "Fixed BOQ amount"),
  };
}

export async function createLocation(db: Db, actor: Actor, input: LocationInput) {
  assertDeputyRegistrar(actor);
  const code = text(input.code, "Code", { required: true, max: 40 }).toUpperCase();
  const data = locationData(input);
  try {
    return await db.$transaction(async (tx) => {
      const location = await tx.location.create({ data: { code, ...data }, select: { id: true } });
      await tx.activityLog.create({
        data: { userId: actor.id, action: "LOCATION_CREATED", entityType: "Location", entityId: location.id, description: `Created location ${data.name}.` },
      });
      return location;
    });
  } catch (error) {
    uniqueViolation(error, "Another location already uses this code or BOQ number.");
  }
}

export async function updateLocation(db: Db, actor: Actor, locationId: string, input: LocationInput) {
  assertDeputyRegistrar(actor);
  const data = locationData(input);
  const active = typeof input.active === "boolean" ? input.active : undefined;
  try {
    return await db.$transaction(async (tx) => {
      const location = await tx.location.update({ where: { id: locationId }, data: { ...data, ...(active === undefined ? {} : { active }) }, select: { id: true } });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: active === false ? "LOCATION_DEACTIVATED" : active === true ? "LOCATION_ACTIVATED" : "LOCATION_UPDATED",
          entityType: "Location",
          entityId: location.id,
          description: `Updated location ${data.name}.`,
        },
      });
      return location;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2025") {
      throw new BoqManagementError("NOT_FOUND", "Location not found.", 404);
    }
    uniqueViolation(error, "Another location already uses this BOQ number.");
  }
}

// ---------------------------------------------------------------------------
// BOQ items
// ---------------------------------------------------------------------------

function boqItemData(input: Record<string, unknown>) {
  return {
    itemNo: text(input.itemNo, "Item no.", { max: 20 }),
    subItem: text(input.subItem, "Sub item", { max: 60 }),
    description: text(input.description, "Description", { required: true, max: 1000 }),
    frequency: frequency(input.frequency),
    monthlyAmount: money(input.monthlyAmount ?? "0", "Monthly amount"),
    unitRate: optionalMoney(input.unitRate, "Rate"),
    unitLabel: text(input.unitLabel, "Unit", { max: 40 }) || null,
    plannedPerYear: optionalInt(input.plannedPerYear, "Planned per year"),
    penaltyRate: optionalMoney(input.penaltyRate, "Fine"),
    details: text(input.details, "Details", { max: 500 }) || null,
    sortOrder: optionalInt(input.sortOrder, "Order") ?? 0,
  };
}

export async function createBoqItem(db: Db, actor: Actor, locationId: string, input: Record<string, unknown>) {
  assertDeputyRegistrar(actor);
  const data = boqItemData(input);
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({ where: { id: locationId }, select: { id: true, name: true } });
    if (!location) throw new BoqManagementError("NOT_FOUND", "Location not found.", 404);
    if (!data.sortOrder) {
      const last = await tx.boqItem.aggregate({ where: { locationId }, _max: { sortOrder: true } });
      data.sortOrder = (last._max.sortOrder ?? 0) + 10;
    }
    const item = await tx.boqItem.create({ data: { locationId, ...data }, select: { id: true } });
    await tx.activityLog.create({
      data: { userId: actor.id, action: "BOQ_ITEM_CREATED", entityType: "BoqItem", entityId: item.id, description: `Added a BOQ item to ${location.name}.` },
    });
    return item;
  });
}

export async function updateBoqItem(db: Db, actor: Actor, itemId: string, input: Record<string, unknown>) {
  assertDeputyRegistrar(actor);
  const active = typeof input.active === "boolean" ? input.active : undefined;
  // Activating / retiring an item does not need the full form.
  const data = Object.keys(input).length === 1 && active !== undefined ? {} : boqItemData(input);
  return db.$transaction(async (tx) => {
    const existing = await tx.boqItem.findUnique({ where: { id: itemId }, select: { id: true, location: { select: { name: true } } } });
    if (!existing) throw new BoqManagementError("NOT_FOUND", "BOQ item not found.", 404);
    const item = await tx.boqItem.update({ where: { id: itemId }, data: { ...data, ...(active === undefined ? {} : { active }) }, select: { id: true } });
    await tx.activityLog.create({
      data: {
        userId: actor.id,
        action: "BOQ_ITEM_UPDATED",
        entityType: "BoqItem",
        entityId: item.id,
        description: `${active === false ? "Retired" : active === true ? "Restored" : "Updated"} a BOQ item of ${existing.location.name}.`,
      },
    });
    return item;
  });
}
