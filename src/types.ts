export interface SiteInfo {
  siteId: string;
  siteName: string;
  address: string;
}

export interface InventoryItem {
  code: string;
  description: string;
  uom: string;
  category: string;
  /** From Summary sheet, matched by part number (max across matching rows) */
  available?: number;
  npMnl?: number;
  sbfCeb?: number;
  sbfDav?: number;
}

export type Section = 'main' | 'local';

export interface LineItem {
  id: string;
  partNumber: string;
  description: string;
  packageNo: string;
  qtyReq: string;
  section: Section;
}

export interface MrfHeader {
  projectPrefix: string;
  date: string; // ISO yyyy-mm-dd
  seq: string; // e.g. "004"
  from: string;
  destination: string;
  siteId: string;
  siteName: string; // from the site masterlist, e.g. "MATALA"
  siteAddress: string;
  equipmentLabel: string; // e.g. "MF2" or "MF2-DF16"
  company: string; // e.g. "DNA"
  /** when true, the MRF no. is generated from the other fields */
  mrfAuto: boolean;
  /** manual MRF no. (used when mrfAuto is false) */
  mrfNo: string;
}

export interface MrfDraft {
  id: string;
  header: MrfHeader;
  items: LineItem[];
  updatedAt: number;
}

export const DEFAULT_HEADER: MrfHeader = {
  projectPrefix: 'NOKIA-FN',
  date: new Date().toISOString().slice(0, 10),
  seq: '',
  from: 'Paranaque WHS',
  destination: '',
  siteId: '',
  siteName: '',
  siteAddress: '',
  equipmentLabel: '',
  company: 'DNA',
  mrfAuto: true,
  mrfNo: '',
};

export const MAIN_ROWS = 8; // rows 18-25 in template
export const LOCAL_ROWS = 20; // rows 27-46 in template

function sanitizeName(s: string): string {
  return s.replace(/[\\\/?*[\]:]/g, '-').trim();
}

/**
 * The MRF number, e.g.
 *   NOKIA-FN_10052026-001_MIN938-MNUANG_MF2_DNA
 *
 * Auto-built from prefix + date + sequence + site (PLAID-SiteName) + equipment + company,
 * unless the user turned auto-generation off and typed one manually.
 */
export function buildSheetName(header: MrfHeader): string {
  if (!header.mrfAuto && header.mrfNo.trim()) return sanitizeName(header.mrfNo.trim());

  const g = header.date.replace(/-/g, '');
  const d = g.slice(4) + g.slice(0, 4); // yyyy-mm-dd -> mmddyyyy
  const dateSeq = header.seq ? `${d}-${header.seq}` : d;
  const site = header.siteId
    ? header.siteName
      ? `${header.siteId}-${header.siteName}`
      : header.siteId
    : undefined;
  const parts = [
    header.projectPrefix || 'MRF',
    dateSeq,
    site,
    header.equipmentLabel || undefined,
    header.company || undefined,
  ].filter(Boolean);
  return sanitizeName(parts.join('_'));
}

export function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}
