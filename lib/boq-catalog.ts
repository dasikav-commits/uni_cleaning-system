// Bill of Quantities for the Kuliyapitiya premises (28 services).
// Items and frequencies follow "BOQ-Kuliyapitiya_Doc.pdf"; monthly amounts are
// the BOQ amounts used in the "Amount of work done - Kuliyapitiya Premises"
// report (March). The DR can edit every value on the BOQ page afterwards.
import type { BoqFrequencyKey } from "@/lib/evaluation-calc";
import type { LocationCategoryKey } from "@/lib/application-roles";

export type CatalogItem = {
  itemNo: string;
  subItem: string;
  description: string;
  frequency: BoqFrequencyKey;
  monthlyAmount: string;
  unitRate?: string | null;
  unitLabel?: string;
  plannedPerYear?: number;
  penaltyRate?: string;
  details?: string;
};

export type CatalogLocation = {
  code: string;
  boqNumber: number;
  name: string;
  shortName: string;
  boqDescription: string;
  category: LocationCategoryKey;
  evaluationFormat: "SCHEDULED" | "RATE_BASED";
  /** Fixed monthly BOQ amount (rate-based services, or when item amounts are not yet known). */
  boqAmount?: string;
  /** Shown to the DR when the BOQ needs attention (e.g. amounts still to be entered). */
  note?: string;
  items: CatalogItem[];
};

// --- Standard BOQ wording ---------------------------------------------------

const T = {
  dustMopCommon: "Dust mopping to remove dust, soil & grime; sweeping and cleaning of all compounds - common areas",
  dustMop: "Dust mopping to remove dust, soil & grime; sweeping and cleaning of all compounds",
  dampMopCommonOffice: "Damp mopping of all floors with an all-purpose cleaner - common and office areas",
  dampMop: "Damp mopping of all floors with an all-purpose cleaner",
  furnitureCommon: "Dusting and cleaning of furniture, curtains, carpets and mats; wiping and cleaning of walls - common areas",
  furniture: "Dusting and cleaning of cushion chairs, furniture, curtains, carpets and mats; wiping and cleaning of walls",
  cobwebsCommonOffice:
    "Removal of dust and cobwebs from roofs, ceilings, walls and corners; cleaning of grills, handrails, glass, partitions, window & door frames and electrical fittings - common and office areas",
  cobwebs:
    "Removal of dust and cobwebs from roofs, ceilings, walls and corners; cleaning of grills, handrails, glass, partitions, window & door frames and electrical fittings",
  gutters: "Cleaning of roofs, eave gutters, valley gutters and down pipes",
  guttersAnnual: "Cleaning of roofs, eave gutters, valley gutters and down pipes (once a year in August; annual cost / 12)",
  garbage: "Collection and removal of litter/garbage from the buildings to the place directed by the Works Engineer/PHI",
  bins: "Cleaning, washing and disinfection of garbage bins",
  toiletsCommon: "Cleaning, washing and disinfection of toilet walls, floors, bowls, urinals and commodes - common areas",
  toiletsOffice: "Cleaning, washing and disinfection of toilet walls, floors, bowls, urinals and commodes - office areas",
  toilets: "Cleaning, washing and disinfection of toilet walls, floors, bowls, urinals and commodes",
  fittings: "Wiping and cleaning of all toilet fittings (taps, soap holders, mirrors etc.)",
  gullies: "Cleaning and disinfection of all toilet and bathroom gullies",
  manholes: "Cleaning of manholes, sewer and waste water lines up to the septic tank whenever they get blocked",
  polishing:
    "Spray buffing and machine polishing of cement floors (only on the request of the Deputy Registrar / General Administration; paid only when completed)",
} as const;

type Row = [itemNo: string, subItem: string, description: string, frequency: BoqFrequencyKey];

function withAmounts(rows: Row[], amounts: string[]): CatalogItem[] {
  if (rows.length !== amounts.length) {
    throw new Error(`BOQ catalog: ${rows.length} rows but ${amounts.length} amounts`);
  }
  return rows.map(([itemNo, subItem, description, frequency], index) => ({
    itemNo,
    subItem,
    description,
    frequency,
    monthlyAmount: amounts[index],
  }));
}

/** Faculty / office buildings: items 1-4 with separate common & office toilets. */
function officeBuilding(polishing: string | null): Row[] {
  const rows: Row[] = [
    ["1", "a", T.dustMopCommon, "DAILY"],
    ["1", "b", T.dampMopCommonOffice, "WEEKLY"],
    ["2", "a", T.furnitureCommon, "DAILY"],
    ["2", "b", T.cobwebsCommonOffice, "MONTHLY"],
    ["2", "c", T.gutters, "MONTHLY"],
    ["3", "a", T.garbage, "DAILY"],
    ["3", "b", T.bins, "DAILY"],
    ["4", "a.I", T.toiletsCommon, "TWICE_DAILY"],
    ["4", "a.II", T.toiletsOffice, "DAILY"],
    ["4", "b", T.fittings, "DAILY"],
    ["4", "c", T.gullies, "WEEKLY"],
    ["4", "d", T.manholes, "WHEN_NECESSARY"],
  ];
  if (polishing !== null) rows.push(["5", "a", polishing ? `${T.polishing} - ${polishing}` : T.polishing, "ON_REQUEST"]);
  return rows;
}

/** Student halls: garbage & toilets twice a day, gutters once a year. */
function hall(withPolishing: boolean): Row[] {
  const rows: Row[] = [
    ["1", "a", T.dustMop, "DAILY"],
    ["1", "b", T.dampMop, "WEEKLY"],
    ["2", "a", T.furniture, "DAILY"],
    ["2", "b", T.cobwebs, "WEEKLY"],
    ["2", "c", T.guttersAnnual, "ANNUAL"],
    ["3", "a", T.garbage, "TWICE_DAILY"],
    ["3", "b", T.bins, "DAILY"],
    ["4", "a", T.toilets, "TWICE_DAILY"],
    ["4", "b", T.fittings, "DAILY"],
    ["4", "c", T.gullies, "WEEKLY"],
    ["4", "d", T.manholes, "WHEN_NECESSARY"],
  ];
  if (withPolishing) rows.push(["5", "a", T.polishing, "ON_REQUEST"]);
  return rows;
}

/** Medical Centre / New VC Lodge layout (single toilet row, daily toilets). */
function smallUnit(toiletFrequency: BoqFrequencyKey, cobwebFrequency: BoqFrequencyKey = "WEEKLY"): Row[] {
  return [
    ["1", "a", T.dustMop, "DAILY"],
    ["1", "b", T.dampMop, "WEEKLY"],
    ["2", "a", T.furniture, "DAILY"],
    ["2", "b", T.cobwebs, cobwebFrequency],
    ["2", "c", T.gutters, "MONTHLY"],
    ["3", "a", T.garbage, "DAILY"],
    ["3", "b", T.bins, "DAILY"],
    ["4", "a", T.toilets, toiletFrequency],
    ["4", "b", T.fittings, "DAILY"],
    ["4", "c", T.gullies, "WEEKLY"],
    ["4", "d", T.manholes, "WHEN_NECESSARY"],
  ];
}

const threeStoreyHallAmounts = ["10000", "15000", "10000", "13000", "10000", "10000", "8000", "10000", "10000", "15000", "25000", "33770.75"];
const fourStoreyHallAmounts = ["15000", "20000", "15000", "25000", "40000", "15000", "15000", "10000", "15000", "30000", "26361"];
const libraryAmounts = ["30000", "30000", "25000", "30000", "30000", "25000", "10000", "12951.25", "15000", "20000", "25000", "30000"];

function location(
  boqNumber: number,
  shortName: string,
  name: string,
  boqDescription: string,
  category: LocationCategoryKey,
  items: CatalogItem[],
  extra: Partial<CatalogLocation> = {},
): CatalogLocation {
  return {
    code: `KUL-${String(boqNumber).padStart(2, "0")}`,
    boqNumber,
    name,
    shortName,
    boqDescription,
    category,
    evaluationFormat: "SCHEDULED",
    items,
    ...extra,
  };
}

const cjs = "Cleaning and Janitorial Services at the";

const landscapeZones: Array<[string, string, string]> = [
  ["Zone 1", "Faculty of Business Studies & Finance, Dept. of English Language Teaching, Maintenance - bush cutter, approx. 3 acres", "44000"],
  ["Zone 2", "Administration Complex, ponds, canal - bush cutter, approx. 1 acre", "14600"],
  ["Zone 3", "Auditorium area, Student Center - slasher, approx. 4 acres", "58400"],
  ["Zone 4", "Faculty of Applied Sciences, Dept. of Physical Education - slasher & bush cutter, approx. 7 acres", "102200"],
  ["Zone 5", "Faculty of Technology, Staff Quarters - slasher & bush cutter, approx. 7 acres", "102200"],
  ["Zone 6", "Outdoor Theater, Staff Quarters, Medical Center, Nano Science Laboratory - slasher & bush cutter, approx. 4 acres", "58400"],
  ["Zone 7", "Playground - slasher & bush cutter, approx. 4 acres", "58400"],
  ["Zone 8", "Surrounding area of the playground - slasher & bush cutter, approx. 1.5 acres", "21900"],
  ["Zone 9", "New Vice-Chancellor's Bungalow, Executive Staff Quarters - slasher & bush cutter, approx. 3 acres", "43800"],
  ["Zone 10", "Hostels, canteens, New Library area - bush cutter, approx. 10 acres", "146000"],
  ["Zone 11", "Vice-Chancellor's Lodge, Weralugama - bush cutter, approx. 0.25 acres", "3650"],
  ["Zone 12", "Other areas - slasher & bush cutter, approx. 8.5 acres", "124100"],
];

/** Toilet pits: [unit, pit sizes, services per year]. Rates per service are set by the DR. */
const toiletPits: Array<[string, string, number]> = [
  ["Old Curator Office", "6x4x6", 1],
  ["Guest House", "7x3x6; 3dia x 6 - 2 pits", 1],
  ["BSF Faculty Department Building", "3dia x 6 - 2 pits; 7x3x6", 1],
  ["BSF Faculty Building", "6x5x6; 12x6x6", 1],
  ["Main Building", "7x4x6 - 2 pits; 12x4x6; 4x4x6 - 2 pits", 1],
  ["L-shape Building", "14x4x6", 1],
  ["Computer Laboratory II / FBSF", "8x3x6; 4x4x6; 5dia x 6", 1],
  ["Old Physical Education unit", "3dia x 6", 1],
  ["Dept. of ELT", "12x4x6", 1],
  ["Lecture Room Building", "12x6x4", 1],
  ["Maintenance Stores Building", "3dia x 6", 1],
  ["New Building Applied Science Faculty", "18x6x6 - 2 pits; 6x6x6 - 2 pits", 1],
  ["Laboratory Building", "3dia x 6 - 2 pits", 1],
  ["Staff Quarters New Building", "13x8x4; 8x6x4", 1],
  ["Canteen Building BSF", "10x6x6; 6x4x6", 4],
  ["Canteen Building Hostel Premises", "11x4x6; 8x4x6; 6x6x6; 3dia x 6; 5x4x3; 4dia x 8", 4],
  ["Boys Hostel Pandukabhaya", "16x5x4; 16x6x6; 11x4x4", 12],
  ["Boys Hostel Paduwasdew", "18x6x6; 6x6x6 - 2 pits", 12],
  ["Girls Hostel Swarnapali", "12x4x6; 5x5x6; 6x5x6", 12],
  ["Girls Hostel Chitradevi", "18x6x6; 6x6x6", 12],
  ["Main Administration Building", "10x10x6 - 2 pits; 3dia x 8 - 3 pits", 4],
  ["New Girls Hostel Seetha Devi", "18x6x6 - 2 pits; 6x6x6 - 2 pits", 12],
  ["New Girls Hostel Vishaka", "18x6x6 - 2 pits; 6x6x6 - 2 pits", 12],
  ["Medical Center", "8x6x6", 1],
  ["Auditorium", "18x6x8 - 2 pits", 1],
  ["Gymnasium", "20x16x8", 1],
  ["Chithradevi Girls hostel", "6x6x6 - 2 pits; 20x18x9 - 2 pits", 12],
  ["Students center", "10x8x8 - 2 pits", 1],
  ["Kuruwita Boys hostel", "6x6x6 - 2 pits; 20x18x9 - 2 pits", 12],
  ["Anuladevi Girls hostel", "6x6x6 - 2 pits; 20x18x9 - 2 pits", 12],
  ["Pavilion", "8x3x3 - 2 pits", 1],
  ["Toilet complex", "8x3x3 - 2 pits", 4],
  ["Academic staff quarters", "8x4x4 - 2 pits", 1],
  ["New staff quarters I (Dean's Quarters 1) FBSF & FAS", "3dia x 8 - 4 pits", 1],
  ["New staff quarters II (Dean's Quarters 2) FOT & Warden Quarters", "3dia x 8 - 4 pits", 1],
  ["Administration building II", "4dia x 8 - 4 pits", 4],
  ["Technology faculty new building", "4dia x 8 - 4 pits", 1],
];

export const KULIYAPITIYA_BOQ: CatalogLocation[] = [
  location(1, "BSF", "Faculty of Business Studies and Finance", `${cjs} Faculty of Business Studies and Finance`, "FACULTY",
    withAmounts(officeBuilding("Depts. of Business Management, Banking & Finance, Insurance, lecture hall under the Library"),
      ["50000", "60000", "55000", "70000", "60000", "40000", "40000", "40000", "40000", "20000", "60000", "90000", "75000"])),
  location(2, "FAS", "Faculty of Applied Sciences", `${cjs} Faculty of Applied Sciences`, "FACULTY",
    withAmounts(officeBuilding("Old FAS Building"),
      ["40000", "40000", "40000", "48000", "48000", "60000", "40000", "30000", "30000", "30000", "40000", "69902.50", "50000"])),
  location(3, "FOT", "Faculty of Technology", `${cjs} Faculty of Technology`, "FACULTY",
    withAmounts(officeBuilding(null),
      ["50000", "100000", "50000", "142896.30", "100000", "80000", "60000", "50000", "50000", "50000", "50000", "100000"])),
  location(4, "Main Administration", "Main Administration Building", `${cjs} Main Administration Building`, "ADMINISTRATION",
    withAmounts(officeBuilding("Pavements only"),
      ["10000", "25000", "10000", "40000", "30000", "20000", "15000", "10000", "10000", "20000", "20000", "47951.25", "25000"])),
  location(5, "Auditorium", "Auditorium Building", `${cjs} Auditorium Building`, "COMMON_UNIT",
    withAmounts([
      ["1", "a", `${T.dustMop} (when necessary or monthly)`, "MONTHLY"],
      ["1", "b", `${T.dampMop} (when necessary or monthly)`, "MONTHLY"],
      ["2", "a", "Dusting and cleaning of cushion chairs, furniture, curtains, carpets and mats; cleaning and disinfection of microphones and flower vases; wiping of walls", "MONTHLY"],
      ["2", "b", T.cobwebs, "MONTHLY"],
      ["2", "c", T.gutters, "MONTHLY"],
      ["3", "a", `${T.garbage} (when necessary or monthly)`, "MONTHLY"],
      ["3", "b", T.bins, "MONTHLY"],
      ["4", "a", `${T.toilets} (when necessary or monthly)`, "MONTHLY"],
      ["4", "b", T.fittings, "MONTHLY"],
      ["4", "c", T.gullies, "MONTHLY"],
      ["4", "d", T.manholes, "MONTHLY"],
    ], ["10000", "10000", "10000", "10000", "15000", "15000", "15000", "10000", "15000", "20000", "20000"])),
  location(6, "Gymnasium", "Gymnasium, Pavilion & Toilet Complex", `${cjs} Gymnasium, Pavilion & Toilet Complex`, "COMMON_UNIT",
    withAmounts(officeBuilding(null),
      ["5000", "8000", "5000", "10000", "10000", "8000", "5000", "5000", "5000", "10000", "15000", "27180.50"])),
  location(7, "Swarnapali", "Swarnapali Hall I & II", `${cjs} Swarnapali Hall I & II`, "HALL", withAmounts(hall(true), threeStoreyHallAmounts)),
  location(8, "Pandukabhaya", "Pandukabhaya Hall I & II", `${cjs} Pandukabhaya Hall I & II`, "HALL", withAmounts(hall(true), threeStoreyHallAmounts)),
  location(9, "Paduwasdew", "Paduwasdew Hall I & II", `${cjs} Paduwasdew Hall I & II`, "HALL", withAmounts(hall(true), threeStoreyHallAmounts)),
  location(10, "Chithradevi", "Chitradevi Hall", `${cjs} Chitradevi Hall`, "HALL", withAmounts(hall(false), fourStoreyHallAmounts)),
  location(11, "Anuladevi", "Anuladevi Hall", `${cjs} Anuladevi Hall`, "HALL", withAmounts(hall(false), fourStoreyHallAmounts)),
  location(12, "Vijitha Kuruwita", "Vijitha Kuruwita Hall", `${cjs} Vijitha Kuruwita Hall`, "HALL", withAmounts(hall(false), fourStoreyHallAmounts)),
  location(13, "Vishaka", "Vishaka Deevi Hall", `${cjs} Vishaka Deevi Hall`, "HALL", withAmounts(hall(false), fourStoreyHallAmounts)),
  location(14, "Seethadevi", "Seetha Deevi Hall", `${cjs} Seetha Deevi Hall`, "HALL", withAmounts(hall(false), fourStoreyHallAmounts)),
  location(15, "Staff Quarters", "Staff Quarters (Old & New) & Guest House", "Cleaning & Janitorial Services at the Staff Quarters (Old & New) & Guest house", "COMMON_UNIT",
    withAmounts([
      ["1", "a", `${T.dustMop} - common areas`, "WEEKLY"],
      ["1", "b", `${T.dampMop} - common areas`, "WEEKLY"],
      ["2", "a", `${T.furniture} - common areas`, "MONTHLY"],
      ["2", "b", `${T.cobwebs} - common areas`, "MONTHLY"],
      ["2", "c", T.gutters, "MONTHLY"],
      ["3", "a", `${T.garbage} - common areas`, "DAILY"],
      ["3", "b", T.bins, "DAILY"],
      ["4", "a", `${T.toilets} - common areas`, "WEEKLY"],
      ["4", "b", T.fittings, "WEEKLY"],
      ["4", "c", T.gullies, "WEEKLY"],
      ["4", "d", T.manholes, "WHEN_NECESSARY"],
      ["5", "a", `${T.polishing} - Executive Staff Quarters & Guest House`, "ON_REQUEST"],
    ], ["10000", "15000", "20000", "20000", "15000", "10000", "10000", "20000", "15000", "15000", "82951.25", "50000"])),
  location(16, "ELT", "Dept. of English Language Teaching", `${cjs} Dept. of English Language Teaching`, "FACULTY",
    withAmounts(officeBuilding(""),
      ["5000", "10000", "3000", "15000", "5000", "3000", "5000", "3000", "5000", "2000", "5000", "10000", "10000"])),
  location(17, "Landscape", "Land, Roads & Landscape", `${cjs} Land, Roads & Landscape`, "LANDSCAPE", [
    ...landscapeZones.map(([zone, description, amount]) => ({
      itemNo: "i",
      subItem: zone,
      description: `Lawn mowing and removal of debris - ${description}`,
      frequency: "MONTHLY" as const,
      monthlyAmount: amount,
    })),
    { itemNo: "ii", subItem: "Carpet roads", description: "Sweeping, manual weeding, cutting edges, cleaning drains & weep holes - approx. 6 acres", frequency: "DAILY", monthlyAmount: "93150" },
    { itemNo: "ii", subItem: "Foot paths", description: "Foot paths & paved areas: sweeping, manual weeding, cutting edges - approx. 2 acres", frequency: "DAILY", monthlyAmount: "29200" },
  ]),
  location(18, "Old VC Lodge", "Old Vice-Chancellor's Lodge", `${cjs} Old Vice-Chancellor's Lodge`, "COMMON_UNIT",
    withAmounts([
      ["1", "a", "Damp mopping of floors; cleaning and disinfection of toilets, fittings and gullies; removal of cobwebs; cleaning of glass, partitions, frames and electrical fittings", "WEEKLY"],
      ["1", "b", "Machine polishing of floors; cleaning of roofs and gutters; removal of hanging branches up to 10 ft; grass cutting in the garden", "MONTHLY"],
    ], ["25000", "25000"])),
  location(19, "Canteens & Student Center", "Canteens & Students Center", `${cjs} Canteens & Students center`, "COMMON_UNIT",
    withAmounts([
      ["1", "a", T.dustMop, "DAILY"],
      ["1", "b", T.dampMop, "WEEKLY"],
      ["2", "a", "Dusting and cleaning of furniture, curtains, carpets and mats; wiping and cleaning of walls", "DAILY"],
      ["2", "b", T.cobwebs, "WEEKLY"],
      ["2", "c", T.gutters, "MONTHLY"],
      ["3", "a", "Collection and removal of litter/garbage from the buildings & canteen to the place directed by the Works Engineer", "DAILY"],
      ["3", "b", T.bins, "DAILY"],
      ["4", "a", T.toilets, "TWICE_DAILY"],
      ["4", "b", T.fittings, "DAILY"],
      ["4", "c", T.gullies, "WEEKLY"],
      ["4", "d", T.manholes, "WHEN_NECESSARY"],
      ["5", "a", "Canteen: removal of dustbins; canteen drains kept clean throughout the day", "TWICE_DAILY"],
      ["5", "b", "Canteen: cleaning of pantry, tables, sinks, washbasins, glazed tiled walls and counter tops", "DAILY"],
      ["5", "c", "Canteen: cleaning of waste water gullies & drains", "WEEKLY"],
      ["6", "a", `${T.polishing} - Hostel Canteen & Student Center`, "ON_REQUEST"],
    ], ["10000", "15000", "15000", "10000", "20000", "15000", "10000", "10000", "15000", "20000", "30000", "20000", "10000", "15000", "11361"])),
  location(20, "Medical Center", "Medical Centre", `${cjs} Medical Centre`, "COMMON_UNIT",
    withAmounts(smallUnit("DAILY"), ["10000", "10000", "10000", "10000", "10000", "10000", "10000", "10000", "15000", "20000", "15000"])),
  location(21, "New VC Lodge", "New Vice-Chancellor's Lodge", `${cjs} New Vice-Chancellor's Lodge`, "COMMON_UNIT",
    withAmounts(smallUnit("DAILY"), ["10000", "10000", "10000", "15000", "20000", "10000", "10000", "10000", "5000", "20000", "21312.25"])),
  location(22, "Facility Center", "Facility Center", `${cjs} Facility Center`, "COMMON_UNIT",
    withAmounts(smallUnit("TWICE_DAILY", "MONTHLY"), ["5000", "10000", "5000", "10000", "10000", "5000", "5000", "10000", "5000", "6000", "10000"])),
  location(23, "Daycare Center", "Daycare Center", `${cjs} Daycare Center`, "COMMON_UNIT",
    withAmounts([
      ["1", "a", `${T.dustMop} - common areas`, "DAILY"],
      ["1", "b", `${T.dampMop} - common areas`, "WEEKLY"],
      ["2", "a", `${T.furniture} - common areas`, "DAILY"],
      ["2", "b", `${T.cobwebs} - common areas`, "WEEKLY"],
      ["2", "c", T.gutters, "MONTHLY"],
      ["3", "a", T.garbage, "TWICE_DAILY"],
      ["3", "b", T.bins, "DAILY"],
      ["4", "a", T.toilets, "TWICE_DAILY"],
      ["4", "b", T.fittings, "DAILY"],
      ["4", "c", T.gullies, "WEEKLY"],
      ["4", "d", T.manholes, "WHEN_NECESSARY"],
    ], ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]),
    {
      boqAmount: "85313.18",
      note: "The item-wise amounts for the Daycare Center were not in the March sheets. Enter them so they add up to Rs. 85,313.18.",
    }),
  location(24, "New Library", "New Library", `${cjs} New Library`, "COMMON_UNIT", withAmounts(officeBuilding(null), libraryAmounts)),
  location(25, "Business Center", "Business Center", `${cjs} Business Center`, "COMMON_UNIT", withAmounts(officeBuilding(null), libraryAmounts)),
  location(26, "Garbage", "Remove of Garbage", "Remove of Garbage", "EXTERNAL_SERVICE", [
    {
      itemNo: "1",
      subItem: "",
      description: "All garbage (except compostable waste) removed from the university premises using a tractor and unloaded outside with approval of the local authority",
      frequency: "DAILY",
      monthlyAmount: "400000",
    },
  ]),
  location(27, "Toilet Pits", "Cleaning of Toilet Pits", "Cleaning of Toilet Pits", "EXTERNAL_SERVICE",
    toiletPits.map(([unit, sizes, perYear], index) => ({
      itemNo: String(index + 1),
      subItem: "",
      description: unit,
      frequency: "PER_SERVICE" as const,
      monthlyAmount: "0",
      unitRate: null,
      unitLabel: "service",
      plannedPerYear: perYear,
      details: `Pit size (ft): ${sizes}`,
    })),
    {
      evaluationFormat: "RATE_BASED",
      boqAmount: "100000",
      note: "Enter the rate per service for each toilet pit (from the contract) before the first report is filled in.",
    }),
  location(28, "Dogs & Cats", "Remove Dogs & Cats", "Remove Dogs & Cats", "EXTERNAL_SERVICE", [
    {
      itemNo: "1",
      subItem: "",
      description: "Catch a dog without any harm, transport safely and hand over to a suitable animal care institute",
      frequency: "PER_SERVICE",
      monthlyAmount: "0",
      unitRate: "7500",
      unitLabel: "dog",
      plannedPerYear: 20,
      penaltyRate: "7500",
      details: "Fine of Rs. 7,500 per animal not removed as instructed by the University",
    },
    {
      itemNo: "2",
      subItem: "",
      description: "Catch a cat without any harm, transport safely and hand over to a suitable animal care institute",
      frequency: "PER_SERVICE",
      monthlyAmount: "0",
      unitRate: "7500",
      unitLabel: "cat",
      plannedPerYear: 10,
      penaltyRate: "7500",
      details: "Fine of Rs. 7,500 per animal not removed as instructed by the University",
    },
  ], {
    evaluationFormat: "RATE_BASED",
    boqAmount: "18750",
    note: "Rate per animal is set to Rs. 7,500 (Rs. 18,750 x 12 / 30 animals). Change it if the contract rate differs.",
  }),
];
