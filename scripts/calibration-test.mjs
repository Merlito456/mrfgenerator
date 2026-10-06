// Calibration test: engine output must reproduce the provided sample BOMs.
import { readFileSync } from 'node:fs';

const { buildBom, DEFAULT_ANSWERS } = await import('../src/lib/bomRules.ts');
const { parseInventoryWorkbook } = await import('../src/lib/inventory.ts');

const invBuf = readFileSync(new URL('../test-inventory.xlsx', import.meta.url));
const catalog = await parseInventoryWorkbook(
  invBuf.buffer.slice(invBuf.byteOffset, invBuf.byteOffset + invBuf.byteLength),
);
const byCode = new Map(catalog.map((i) => [i.code.toUpperCase(), i]));

// Sample description -> part number alias map (samples use slightly different wording)
const ALIAS = {
  'MF2-FAN Module': '3FE76518AA',
  'Labeller tape': 'Blaine-Cartridge9mm',
  'cable shoe (#14 AWG)': 'L00CS14AWG',
  '16-10mm2 Terminal Lugs': 'L00LUGS-16-10',
  'Plastic Cable Tie white': 'Blaine-8"Tie',
  'Spiral Wrap 10mmx10ft': 'Blaine-Spiral-1/2mmx10ft',
  'VELCRO (HOOK & LOOP TIE) BLACK 10m/roll': 'L00HLT_VELCRO_10M',
  'Shrinkable tube 16mm x 200mm': 'Blaine-16mm-Shrinkable-p',
  'Shrinkable tube 8mm x 200mm': 'Blaine-8mmShrinkable',
  'Shrinkable tube 12mm x 200mm': 'Blaine-12mmShrinkable',
  'WIRE GROUNDING CABLE YELLOW/GREEN 16MM N/A': 'L00YG16MM2',
  'Power Cable Blue/Black 20m': '3FE77365AA_20m',
  'Lightspan MF 16port Multi-PON Line board (LWLT-C) - SW STAGED': '3FE76353AA-S',
  'POSITIVE POWER CABLE BLACK/10M': '3FE77365BA',
};

// Items the samples reference but that do not exist in the database — known deviations
const KNOWN_GAPS = ['UNRESOLVED:VELCRO (HOOK & LOOP TIE) BLACK 2M'];
// Accepted substitutions for those gaps
const KNOWN_SUBSTITUTIONS = new Map([
  ['UNRESOLVED:VELCRO (HOOK & LOOP TIE) BLACK 2M', 'L00HLT_VELCRO_10M'],
]);

function normDesc(s) {
  return s.toLowerCase().replace(/brand:?\s*nokia\)?/i, '').replace(/\(brand[^)]*\)/i, '').replace(/[^a-z0-9]/g, '');
}

function sampleToMap(file) {
  const items = JSON.parse(readFileSync(new URL('./calibration/' + file.replace('../calibration/', ''), import.meta.url), 'utf-8'));
  const map = new Map();
  for (const it of items) {
    let code = ALIAS[it.itemDescription.trim()];
    if (!code) {
      // resolve by normalized description containment against the DB
      const n = normDesc(it.itemDescription);
      for (const item of catalog) {
        const dn = normDesc(item.description);
        if (dn === n || (n.length > 12 && (dn.includes(n) || n.includes(dn)))) {
          code = item.code;
          break;
        }
      }
    }
    const key = (code ?? 'UNRESOLVED:' + it.itemDescription).toUpperCase();
    map.set(key, (map.get(key) ?? 0) + it.quantityRequested);
  }
  return map;
}

function compare(name, answers, sampleFile) {
  const { lines, warnings } = buildBom(answers, catalog);
  const got = new Map();
  for (const l of lines) got.set(l.partNumber.toUpperCase(), (got.get(l.partNumber.toUpperCase()) ?? 0) + Number(l.qtyReq));
  const want = sampleToMap(sampleFile);

  const missing = [];
  for (const [code, qty] of want) {
    if (KNOWN_GAPS.includes(code)) continue; // not in DB — documented deviation
    if ((got.get(code) ?? 0) !== qty) missing.push(`  expected ${code} x${qty}, got x${got.get(code) ?? 0}`);
  }
  const extra = [];
  for (const [code, qty] of got) {
    const substituted = [...KNOWN_SUBSTITUTIONS.entries()]
      .some(([gap, sub]) => want.has(gap) && sub === code);
    if (!want.has(code) && !substituted) extra.push(`  unexpected ${code} x${qty}`);
  }
  if (missing.length === 0 && extra.length === 0) {
    console.log(`PASS ${name} (${lines.length} lines)`);
  } else {
    console.log(`FAIL ${name}`);
    [...missing, ...extra].forEach((l) => console.log(l));
  }
  for (const w of warnings) console.log('   warn:', w);
}

// Sample 1 (gemini-code-1791281175086): MF2, indoor, standard feed, 2 LT, no breakers
compare('sample 1175086 — MF2 indoor 2LT', {
  ...DEFAULT_ANSWERS,
  equipment: ['MF2'],
  environment: 'indoor',
  transportOutside: false,
  tapping: 'none',
  groundingLength: 10,
  breakersNeeded: false,
  downlinkLength: 2,
  ltCards: 2,
  swStaged: false,
}, '../calibration/sample-indoor-2lt.json');

// Sample 1289950: MF2 indoor 1LT SW-staged, dummy plate
compare('sample 1289950 — MF2 indoor 1LT SW', {
  ...DEFAULT_ANSWERS,
  equipment: ['MF2'],
  environment: 'indoor',
  tapping: 'none',
  groundingLength: 10,
  breakersNeeded: false,
  downlinkLength: 2,
  ltCards: 1,
  swStaged: true,
}, '../calibration/sample-indoor-1lt-sw.json');
