// Headless smoke test for the wizard BOM rules engine.
const { buildBom, DEFAULT_ANSWERS, checkCapacity } = await import('../src/lib/bomRules.ts');
const { parseInventoryWorkbook } = await import('../src/lib/inventory.ts');
const { readFileSync } = await import('node:fs');

const buf = readFileSync(new URL('../test-inventory.xlsx', import.meta.url));
const catalog = await parseInventoryWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
);

function run(name, answers) {
  const { lines, warnings } = buildBom(answers, catalog);
  const cap = checkCapacity(lines);
  console.log(`\n=== ${name} — ${lines.length} lines, capacity ${cap.length ? 'FAIL: ' + cap.join('; ') : 'ok'}`);
  for (const w of warnings) console.log('   warn:', w);
  for (const l of lines) console.log(`   [${l.section}] ${l.partNumber} x${l.qtyReq} — ${l.description.slice(0, 60)}`);
}

// Scenario A: MF2, outdoor, transport outside 5m, tapping both same RS 12m, grounding 8m,
// breakers 2x 32A Schneider, downlink 2m, 2 LT cards
run('A: MF2 outdoor full', {
  ...DEFAULT_ANSWERS,
  transportOutside: true,
  transportDistance: 5,
  tapping: 'same',
  distSame: 12,
  groundingLength: 8,
  breakersNeeded: true,
  breakerQty: 2,
  breakerRating: 32,
  breakerBrand: 'SCHNEIDER',
  downlinkLength: 2,
  ltCards: 2,
});

// Scenario B: MF2 indoor, single tapping 7m, 1 LT card, no breakers, downlink 3m
run('B: MF2 indoor single 7m 1LT', {
  ...DEFAULT_ANSWERS,
  environment: 'indoor',
  tapping: 'single',
  distSingle: 7,
  ltCards: 1,
  downlinkLength: 3,
  groundingLength: 3,
});

// Scenario C: DF16 outdoor, two separate RS at 9m and 12m, grounding 20m
run('C: DF16 outdoor two RS 9/12m', {
  ...DEFAULT_ANSWERS,
  equipment: ['DF16'],
  tapping: 'two',
  distRs1: 9,
  distRs2: 12,
  groundingLength: 20,
  breakersNeeded: true,
  breakerQty: 1,
  breakerRating: 63,
});
