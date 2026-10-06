import { InventoryItem, LineItem, Section } from '../types';

export type EquipmentType = 'MF2' | 'DF16';
export type TappingMode = 'none' | 'single' | 'two' | 'same';
export type BreakerBrand = 'NADER' | 'SCHNEIDER';

export interface WizardAnswers {
  equipment: EquipmentType[];
  environment: 'indoor' | 'outdoor';
  // Q3 — outdoor only
  transportOutside: boolean;
  transportDistance: number; // actual distance in m (drives 15 PA LTC meters)
  // Q4 — tapping point
  tapping: TappingMode;
  distSingle: number; // OLT -> RS (single cable)
  distRs1: number; // OLT -> RS1 (both, separate RS)
  distRs2: number; // OLT -> RS2 (both, separate RS)
  distSame: number; // OLT -> the shared RS (both, same RS)
  // Q5
  groundingLength: number;
  // Q6
  breakersNeeded: boolean;
  breakerQty: number;
  breakerRating: number; // 6 | 16 | 20 | 25 | 32 | 40 | 63
  breakerBrand: BreakerBrand;
  // Q7
  downlinkLength: number; // 1.5 | 2 | 3 | 5 | 8 | 10 | 15
  // Q8 — MF2 only
  ltCards: 1 | 2;
  swStaged: boolean; // LWLT-C "- SW STAGED" variant (3FE76353AA-S)
}

export const DEFAULT_ANSWERS: WizardAnswers = {
  equipment: ['MF2'],
  environment: 'indoor',
  transportOutside: false,
  transportDistance: 10,
  tapping: 'none',
  distSingle: 0,
  distRs1: 0,
  distRs2: 0,
  distSame: 0,
  groundingLength: 10,
  breakersNeeded: false,
  breakerQty: 1,
  breakerRating: 16,
  breakerBrand: 'SCHNEIDER',
  downlinkLength: 2,
  ltCards: 2,
  swStaged: false,
};

// ---- Database part numbers (Blaine-OLT Material Master List) ----
const LTC_25 = '3FE82503AC'; // LTC Metallic 25 PA Coating (m)
const LTC_CONN_25 = '3FE82502AC'; // LTC Connector 25 (pc)
const LTC_15 = '3FE82503AD'; // LTC Metallic 15 PA Coating (m)
const LTC_CONN_15 = '3FE82502AD'; // LTC Connector 15 (pc)

const MF2_POWER_LENGTHS = [10, 15, 20];
const MF2_POWER_CABLE: Record<number, string> = {
  10: '3FE77365BA', // Lightspan MF-2 DC power cable ETSI (10m)
  15: '3FE77365BA-15M', // MF2 power cable/Black 15M ("Power Cable Blue/Black 15m")
  20: '3FE77365AA_20m', // Power Cable Blue/Black 20m
};
const DF_POWER_CABLE_10M = '3FE72993GA'; // DF 16GM POWER CABLES(10M) — 20M not in DB

const UPLINK_PCORD_LENGTHS = [3, 5, 8];
const UPLINK_PCORD: Record<number, string> = {
  3: '3FE52344DAAA', // Patch cord 3M LC-LC SM
  5: '3FE52344ELAA', // Patch cord 5M LC-LC SM
  8: '3FE52344FLAA', // Simplex patch cord LC/UPC-LC/UPC 8m
};

const DOWNLINK_PCORD: Record<string, string> = {
  '1.5': '3FE60713BLAA',
  '2': '3FE60713CAAA',
  '3': '3FE60713DA',
  '5': '3FE60713ELAA',
  '8': '3FE60713FLAA',
  '10': '3FE60713GAAA',
  '15': '3FE60713GLAA',
};

// Grounding: pre-made 3 m / 5 m cables; longer runs use bulk 16 mm² Y/G per meter
const GROUND_SHORT_LENGTHS = [3, 5];
const GROUND_SHORT: Record<number, string> = {
  3: '3FE27505DAAA', // MX-6 GND Cable, 3m, 2.5mm2
  5: '3FE27505EL', // WIRE GROUNDING CABLE (5m/pc) Y/G 16MM
};
const GROUND_BULK = 'L00YG16MM2'; // 16mm2 Grounding Cable Y/G (m)

// Standard install kit present in every calibrated sample (local materials)
const STANDARD_KIT: Array<[string, number]> = [
  ['Blaine-Spiral-1/2mmx10ft', 1], // Spiral Wrap 10mmx10ft
  ['L00HLT_VELCRO_10M', 1], // VELCRO (HOOK & LOOP TIE) BLACK 10m/roll
  ['Blaine-8mmShrinkable', 2], // Shrinkable tube 8mm x 200mm
  ['Blaine-12mmShrinkable', 2], // Shrinkable tube 12mm x 200mm
  ['Blaine-16mm-Shrinkable-p', 2], // Shrinkable tube 16mm x 200mm
  ['Blaine-Cartridge9mm', 1], // Labeller tape / cartridge
  ['L00CS14AWG', 4], // cable shoe (#14 AWG)
  ['L00Lugs10mm2', 6], // 10mm2 Terminal Lugs
  ['L00LUGS-16-10', 2], // 16-10mm2 Terminal Lugs
  ['Blaine-8mmLugs', 6], // terminal lugs 8mm
  ['Blaine-8"Tie', 1], // Plastic Cable Tie white
];

// Base equipment BOMs: [part number, qty] (LWLT-C is scaled by LT-card count)
const EQUIPMENT_BOM: Record<EquipmentType, Array<[string, number]>> = {
  MF2: [
    ['3FE76762AA', 1], // Lightspan MF-2 shelf incl. fan unit (LMXR-A)
    ['3FE76518AA', 1], // MF2-FAN Module
    ['3FE76559BA', 2], // Lightspan MF-2 DC power module (LPWR-B DC)
    ['3FE76476AA', 2], // LightspanMF-2 240Gbps NT with clock sync (LMNT-A)
    ['3FE62600AA', 2], // Optical Transceiver SFP+ 10G (uplink)
  ],
  DF16: [
    ['CFXR-H DF16', 1], // DF16 rack — NOT in the database (flagged as warning)
    ['3FE77670AA', 1], // Lightspan DF-16GM shelf incl. fan unit
    ['3FE77645AA', 2], // Lightspan DF-16GM DC power module
    ['3FE53441AC', 8], // GPON SFP B+ (I-temp) OLT
    ['3FE47581AB', 4], // Transcvr XGS-PON/GPON MPM B+
  ],
};

const GPON_SFP = '3FE53441AA'; // PON Transceiver GPON SFP B+
const XGS_SFP = '3FE47581AB'; // Transcvr XGS-PON/GPON MPM B+
const LWLT_C = '3FE76353AA'; // Lightspan MF 16port Multi-PON Line board
const LWLT_C_SW = '3FE76353AA-S'; // LWLT-C — SW STAGED variant
const DUMMY_PLATE = '3FE69465AA'; // Universal dummy plate

export interface BomResult {
  lines: LineItem[];
  warnings: string[];
}

/** Smallest available length that strictly exceeds the given distance. */
function exceedLength(distance: number, options: number[]): { len: number | null; warn?: string } {
  const fit = options.filter((l) => l > distance);
  if (fit.length > 0) return { len: Math.min(...fit) };
  return {
    len: options[options.length - 1],
    warn: `No cable longer than ${distance}m — used the longest available (${options[options.length - 1]}m).`,
  };
}

let seq = 0;
const mkId = () => `bom-${Date.now()}-${seq++}`;

export function buildBom(a: WizardAnswers, catalog: InventoryItem[]): BomResult {
  const warnings: string[] = [];
  const byCode = new Map(catalog.map((i) => [i.code.toUpperCase(), i]));
  const merged = new Map<string, { code: string; qty: number; section: Section }>();

  const add = (code: string, qty: number, section: Section) => {
    if (qty <= 0) return;
    const key = code.toUpperCase();
    const prev = merged.get(key);
    if (prev) prev.qty += qty;
    else merged.set(key, { code, qty, section });
  };

  const isMF2 = a.equipment.includes('MF2');
  const isDF16 = a.equipment.includes('DF16');
  const isOutdoor = a.environment === 'outdoor';
  // Number of 16-port LT units drives per-port quantities (downlink cords)
  const ltUnits = isMF2 ? a.ltCards : isDF16 ? 1 : 0;

  // 1 & 8 — equipment base BOM + LT-card scaling
  for (const eq of a.equipment) {
    for (const [code, qty] of EQUIPMENT_BOM[eq]) add(code, qty, 'main');
  }
  if (isMF2) {
    add(a.swStaged ? LWLT_C_SW : LWLT_C, a.ltCards, 'main');
    add(GPON_SFP, 8 * a.ltCards, 'main');
    add(XGS_SFP, 8 * a.ltCards, 'main');
    if (a.ltCards === 1) add(DUMMY_PLATE, 1, 'local');
  }

  // Standard install kit (every calibrated MRF includes it)
  for (const [code, qty] of STANDARD_KIT) add(code, qty, 'local');

  // Power-cable runs from the tapping point answers (Q4).
  // Cable length = smallest available length STRICTLY EXCEEDING the distance;
  // LTC 25 PA meters = the actual distance.
  const runs: Array<{ dist: number; cables: number }> =
    a.tapping === 'none'
      ? [{ dist: 10, cables: 2 }] // standard feed: 2 x 10m
      : a.tapping === 'single'
        ? [{ dist: a.distSingle, cables: 1 }]
        : a.tapping === 'two'
          ? [
              { dist: a.distRs1, cables: 1 },
              { dist: a.distRs2, cables: 1 },
            ]
          : [{ dist: a.distSame, cables: 2 }];

  let ltc25Total = 0;
  for (const run of runs) {
    if (a.tapping === 'none') {
      // Standard feed: fixed 10 m cables (per calibration samples)
      add(isDF16 ? DF_POWER_CABLE_10M : MF2_POWER_CABLE[10], run.cables, 'local');
    } else if (isDF16 && run.dist < 10) {
      // DF16 uses its own 10 m power cable for short runs
      add(DF_POWER_CABLE_10M, run.cables, 'local');
    } else {
      const { len, warn } = exceedLength(run.dist, MF2_POWER_LENGTHS);
      if (warn) warnings.push(warn);
      if (isDF16 && run.dist >= 10) {
        warnings.push('DF 16GM power cable > 10m is not in the database — substituted the MF2 equivalent.');
      }
      add(MF2_POWER_CABLE[len!], run.cables, 'local');
    }
    if (isOutdoor && run.dist > 0) ltc25Total += run.dist;
  }

  // 25 PA LTC connectors: 2 per run (both ends); 'single' and 'two' use 4 total
  const conn25 = isOutdoor ? { none: 2, single: 4, two: 4, same: 2 }[a.tapping] : 0;
  if (isOutdoor && ltc25Total > 0) {
    add(LTC_25, ltc25Total, 'local');
    add(LTC_CONN_25, conn25, 'local');
  }

  // Q3 — transport equipment outside the OLT location (outdoor only):
  // 15 PA LTC = actual transport distance; uplink LC-LC cord = smallest of 3/5/8m exceeding it
  if (isOutdoor && a.transportOutside) {
    add(LTC_15, a.transportDistance, 'local');
    add(LTC_CONN_15, 2, 'local');
  }
  {
    const { len, warn } = a.transportOutside
      ? exceedLength(a.transportDistance, UPLINK_PCORD_LENGTHS)
      : { len: 8 as number | null, warn: undefined };
    if (warn) warnings.push(warn);
    if (len !== null) add(UPLINK_PCORD[len], 2, 'local'); // one per uplink port
  }

  // 5 — grounding cable (no LTC): <=5m uses pre-made 3/5m; longer uses bulk per meter
  if (a.groundingLength > 0) {
    if (a.groundingLength <= 5) {
      const { len, warn } = exceedLength(a.groundingLength, GROUND_SHORT_LENGTHS);
      if (warn) warnings.push(warn);
      add(GROUND_SHORT[len!], 1, 'local');
    } else {
      add(GROUND_BULK, Math.ceil(a.groundingLength), 'local');
    }
  }

  // 6 — breakers
  if (a.breakersNeeded && a.breakerQty > 0) {
    add(`L00CB${a.breakerRating}A-${a.breakerBrand === 'NADER' ? 'N' : 'S'}`, a.breakerQty, 'local');
  }

  // 7 — downlink patch cord: 16 cords per 16-port LT unit
  if (a.downlinkLength > 0 && ltUnits > 0) {
    const code = DOWNLINK_PCORD[String(a.downlinkLength)];
    if (code) add(code, 16 * ltUnits, 'local');
    else warnings.push(`No downlink patch cord of ${a.downlinkLength}m found — add one manually.`);
  }

  const lines: LineItem[] = [];
  for (const { code, qty, section } of merged.values()) {
    const item = byCode.get(code.toUpperCase());
    lines.push({
      id: mkId(),
      partNumber: item?.code ?? code,
      description: item?.description ?? '(not in database)',
      packageNo: '',
      qtyReq: String(qty),
      section,
    });
    if (!item) warnings.push(`${code} was not found in the loaded database — verify manually.`);
  }

  return { lines, warnings };
}

/** Row capacities of the printed form. */
export function checkCapacity(lines: LineItem[]): string[] {
  const errors: string[] = [];
  const main = lines.filter((l) => l.section === 'main').length;
  const local = lines.filter((l) => l.section === 'local').length;
  if (main > 8) errors.push(`${main} main rows exceed the 8 equipment rows on the form.`);
  if (local > 20) errors.push(`${local} local rows exceed the 20 Local Materials/Accessories rows on the form.`);
  return errors;
}
