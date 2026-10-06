// Headless smoke test for the inventory parser against the real Blaine workbook.
import { readFileSync } from 'node:fs';

const { parseInventoryWorkbook } = await import('../src/lib/inventory.ts');

const buf = readFileSync(new URL('../test-inventory.xlsx', import.meta.url));
const file = new File([buf], 'Blaine-OLT Inventory Report 03112026.xlsx');
const items = await parseInventoryWorkbook(file);
console.log('items:', items.length);
const sample = items.find((i) => i.code === '3FE47581AB');
console.log('sample:', JSON.stringify(sample));
const noAvail = items.filter((i) => i.available !== undefined).length;
console.log('items with availability:', noAvail);
const cats = new Set(items.map((i) => i.category));
console.log('categories:', cats.size);
