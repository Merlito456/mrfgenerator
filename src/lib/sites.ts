import * as XLSX from 'xlsx';
import { SiteInfo } from '../types';

export type { SiteInfo };

/**
 * Parse the MINDANAO Site Activity Monitoring workbook.
 * Sites come from the "GLOBE SITE MASTERLIST" sheet:
 * column A = PLAID (site ID), column B = SITE name, column L = SITE_ADD.
 */
export async function parseSitesWorkbook(data: ArrayBuffer): Promise<SiteInfo[]> {
  const wb = XLSX.read(data, { type: 'array' });
  const sheetName =
    wb.SheetNames.find((n) => /masterlist/i.test(n)) ??
    wb.SheetNames.find((n) => /site/i.test(n));
  if (!sheetName) throw new Error('No site masterlist sheet found in the workbook.');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
  });

  // Find the header row (the one where column A is "PLAID")
  let headerIdx = rows.findIndex((r) => /plaid/i.test(String(r[0] ?? '')));
  if (headerIdx === -1) headerIdx = 0;

  const sites: SiteInfo[] = [];
  const seen = new Set<string>();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const siteId = String(r[0] ?? '').trim();
    if (!siteId) continue;
    const key = siteId.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sites.push({
      siteId,
      siteName: String(r[1] ?? '').trim(),
      address: String(r[11] ?? '').trim(), // column L = SITE_ADD
    });
  }

  if (sites.length === 0) throw new Error('No sites found in the masterlist sheet.');
  return sites;
}
