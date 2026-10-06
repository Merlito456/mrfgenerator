import * as XLSX from 'xlsx';
import { InventoryItem } from '../types';

interface Availability {
  available: number;
  npMnl: number;
  sbfCeb: number;
  sbfDav: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Parse the Blaine-OLT style inventory workbook into a searchable catalog. */
export async function parseInventoryWorkbook(data: ArrayBuffer): Promise<InventoryItem[]> {
  const wb = XLSX.read(data, { type: 'array' });

  // --- Master list: Item Code | Description | UOM | Category
  const masterSheet =
    wb.SheetNames.find((n) => /material\s*master/i.test(n)) ??
    wb.SheetNames.find((n) => {
      const first = firstRowValues(wb, n);
      return first.some((v) => /item\s*code/i.test(String(v)));
    });
  if (!masterSheet) throw new Error('No "Material Master List" sheet found in the workbook.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[masterSheet], {
    defval: '',
  });
  const codeKey = Object.keys(rows[0] ?? {}).find((k) => /item\s*code/i.test(k)) ?? 'Item Code';
  const descKey = Object.keys(rows[0] ?? {}).find((k) => /description/i.test(k)) ?? 'Description';
  const uomKey = Object.keys(rows[0] ?? {}).find((k) => /^uom$/i.test(k)) ?? 'UOM';
  const catKey = Object.keys(rows[0] ?? {}).find((k) => /categor/i.test(k)) ?? 'Category';

  const items: InventoryItem[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const code = String(r[codeKey] ?? '').trim();
    const description = String(r[descKey] ?? '').trim();
    if (!code || !description) continue;
    if (seen.has(code.toUpperCase())) continue;
    seen.add(code.toUpperCase());
    items.push({
      code,
      description,
      uom: String(r[uomKey] ?? '').trim(),
      category: String(r[catKey] ?? '').trim() || '-',
    });
  }

  // --- Summary sheet: stock availability keyed by PART NUMBER
  const summaryName = wb.SheetNames.find((n) => /^summary$/i.test(n.trim()));
  const availability = new Map<string, Availability>();
  if (summaryName) {
    const srows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[summaryName], {
      header: 1,
      defval: '',
    });
    for (const r of srows) {
      const pn = String(r[2] ?? '').trim();
      if (!pn) continue;
      const total = num(r[6]);
      if (!total && !num(r[7]) && !num(r[8]) && !num(r[9])) continue;
      const entry: Availability = {
        available: total,
        npMnl: num(r[7]),
        sbfCeb: num(r[8]),
        sbfDav: num(r[9]),
      };
      const prev = availability.get(pn.toUpperCase());
      if (!prev || entry.available > prev.available) availability.set(pn.toUpperCase(), entry);
    }
  }

  for (const it of items) {
    const a = availability.get(it.code.toUpperCase());
    if (a) {
      it.available = a.available;
      it.npMnl = a.npMnl;
      it.sbfCeb = a.sbfCeb;
      it.sbfDav = a.sbfDav;
    }
  }

  if (items.length === 0) throw new Error('No items found in the Material Master List sheet.');
  return items;
}

function firstRowValues(wb: XLSX.WorkBook, name: string): unknown[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, range: 0, defval: '' });
  return rows[0] ?? [];
}
