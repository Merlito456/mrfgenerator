import JSZip from 'jszip';
import { LineItem, MrfHeader, buildSheetName, formatDisplayDate } from '../types';

const SSML = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

// Template layout (MRF_template.xlsx, sheet 1)
// NOTE: only the right-side header block is populated. The left-side cells
// (B8 destination code, B10 site ID, B12 site address) are left untouched.
const CELL_HEADER = {
  from: 'B6',
  date: 'E6',
  destination: 'E8',
  siteId: 'E10',
  siteAddress: 'E11',
  mrfNoLine1: 'F56', // the underlined line right next to the "MRF:" label
  mrfNoLine2: 'F57', // continuation line below it
};
/** Chars that fit on the first MRF line (F56+G56 at Arial 8) before wrapping. */
const MRF_LINE1_CAPACITY = 45;
const MAIN_START_ROW = 18; // 8 equipment rows (18-25)
const LOCAL_START_ROW = 27; // 20 local materials rows (27-46)

/**
 * Fills the original MRF template in-place at the XML level so that the logo,
 * borders, fonts, merged cells and print setup are preserved exactly.
 */
export async function generateMrfWorkbook(
  templateUrl: string,
  header: MrfHeader,
  items: LineItem[],
): Promise<{ blob: Blob; fileName: string }> {
  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error(`Could not load template (${res.status})`);
  const templateBuf = await res.arrayBuffer();

  const zip = await JSZip.loadAsync(templateBuf);

  // 1. MRF number (full, e.g. NOKIA-FN_10052026-001_MIN938-MNUANG_MF2_DNA).
  //    Excel sheet names are limited to 31 chars, so the sheet gets the truncated form.
  const mrfNo = buildSheetName(header);
  const sheetName = mrfNo.slice(0, 31);
  let workbookXml = await zip.file('xl/workbook.xml')!.async('string');
  workbookXml = renameSheet(workbookXml, sheetName);
  // Print area covers everything through the MRF block (column G) so nothing is
  // cut off by the print page; fit-to-width keeps the full form on one page wide.
  workbookXml = addPrintArea(workbookXml, sheetName);
  zip.file('xl/workbook.xml', workbookXml);

  // 2. Fill values into sheet1
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const sheetXml = await zip.file(sheetPath)!.async('string');
  const filled = fillSheet(sheetXml, header, items);
  // Fit-to-width printing so the right edge of the form is never cut off
  const withPrint = applyPrintSetup(filled);
  // Excel requires the XML declaration on every part; XMLSerializer drops it,
  // so re-attach the template's original prolog.
  zip.file(sheetPath, ensureDeclaration(withPrint, sheetXml));

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return { blob, fileName: `${mrfNo}.xlsx` };
}

function renameSheet(workbookXml: string, newName: string): string {
  return workbookXml.replace(/(<sheet[^>]*name=")[^"]*(")/, `$1${escapeXml(newName)}$2`);
}

function fillSheet(sheetXml: string, header: MrfHeader, items: LineItem[]): string {
  const doc = new DOMParser().parseFromString(sheetXml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Failed to parse template worksheet XML');
  }

  // Header fields (right-side block only; left side stays untouched)
  setValue(doc, CELL_HEADER.from, header.from);
  setValue(doc, CELL_HEADER.date, formatDisplayDate(header.date));
  setValue(doc, CELL_HEADER.destination, header.destination);
  // SITE ID follows the app logic: "PLAID - SITE NAME" when the site is known
  setValue(doc, CELL_HEADER.siteId, header.siteName ? `${header.siteId} - ${header.siteName}` : header.siteId);
  setValue(doc, CELL_HEADER.siteAddress, header.siteAddress);
  // The MRF no. starts on the line next to the "MRF:" label; the underlined
  // line below it is the continuation when the number is too long for one line.
  const mrfNo = buildSheetName(header);
  if (mrfNo.length <= MRF_LINE1_CAPACITY) {
    setValue(doc, CELL_HEADER.mrfNoLine1, mrfNo);
  } else {
    let cut = mrfNo.lastIndexOf('_', MRF_LINE1_CAPACITY);
    if (cut <= 0) cut = MRF_LINE1_CAPACITY;
    setValue(doc, CELL_HEADER.mrfNoLine1, mrfNo.slice(0, cut));
    setValue(doc, CELL_HEADER.mrfNoLine2, mrfNo.slice(cut + 1));
  }

  // Line items
  const main = items.filter((i) => i.section === 'main');
  const local = items.filter((i) => i.section === 'local');
  main.forEach((item, idx) => writeItemRow(doc, MAIN_START_ROW + idx, item));
  local.forEach((item, idx) => writeItemRow(doc, LOCAL_START_ROW + idx, item));

  const out = new XMLSerializer().serializeToString(doc);
  // Safety net: the serialized result must be valid XML before it goes into the zip
  const check = new DOMParser().parseFromString(out, 'application/xml');
  if (check.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Generated worksheet XML is invalid');
  }
  return out;
}

/** Force fit-to-width printing so the right edge of the form is never cut off. */
function applyPrintSetup(sheetXml: string): string {
  let out = sheetXml;
  if (!/<sheetPr/.test(out)) {
    out = out.replace(/(<worksheet[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  }
  const ps = /<pageSetup([^>]*)\/>/.exec(out);
  if (ps) {
    const attr = (name: string, fallback: string) =>
      new RegExp(`${name}="([^"]*)"`).exec(ps[1])?.[1] ?? fallback;
    out = out.replace(
      /<pageSetup[^>]*\/>/,
      `<pageSetup paperSize="${attr('paperSize', '9')}" scale="${attr('scale', '58')}" fitToWidth="1" fitToHeight="0" orientation="${attr('orientation', 'portrait')}" r:id="${attr('r:id', 'rId1')}"/>`,
    );
  }
  return out;
}

/** Set the print area to A1:G57 (the full form) in workbook.xml. */
function addPrintArea(workbookXml: string, sheetName: string): string {
  if (/<definedNames/.test(workbookXml)) return workbookXml;
  const dn = `<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'${escapeXml(sheetName)}'!$A$1:$G$57</definedName></definedNames>`;
  return workbookXml.replace(/<\/sheets>/, `</sheets>${dn}`);
}

/** Re-attach the original <?xml … ?> prolog if the serializer dropped it. */
function ensureDeclaration(serialized: string, originalXml: string): string {
  if (/^<\?xml/.test(serialized)) return serialized;
  const decl = /(^|\r\n|\n)<\?xml[^?]*\?>/.exec(originalXml);
  const prolog = decl ? decl[0].replace(/^(\r\n|\n)/, '') : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return `${prolog}\r\n${serialized}`;
}



function writeItemRow(doc: XMLDocument, row: number, item: LineItem): void {
  setValue(doc, `A${row}`, item.partNumber);
  setValue(doc, `B${row}`, item.description);
  setValue(doc, `C${row}`, item.packageNo);
  setValue(doc, `D${row}`, item.qtyReq);
}

function colToNum(col: string): number {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function setValue(doc: XMLDocument, ref: string, value: string | number): void {
  if (value === undefined || value === null || String(value) === '') return;
  // Strip characters that are illegal in XML 1.0 (would corrupt the workbook)
  // eslint-disable-next-line no-control-regex
  value = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Bad cell ref ${ref}`);
  const rowEl = findRow(doc, Number(m[2]));
  if (!rowEl) throw new Error(`Row ${m[2]} not found in template`);
  const cell = ensureCell(doc, rowEl, ref);
  if (cell.getAttribute('t')) cell.removeAttribute('t');

  while (cell.firstChild) cell.removeChild(cell.firstChild);

  if (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value))) {
    const v = doc.createElementNS(SSML, 'v');
    v.textContent = String(value);
    cell.appendChild(v);
  } else {
    cell.setAttribute('t', 'inlineStr');
    const is = doc.createElementNS(SSML, 'is');
    const t = doc.createElementNS(SSML, 't');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = String(value);
    is.appendChild(t);
    cell.appendChild(is);
  }
}

function findRow(doc: XMLDocument, rowNum: number): Element | null {
  for (const row of Array.from(doc.getElementsByTagNameNS(SSML, 'row'))) {
    if (Number(row.getAttribute('r')) === rowNum) return row;
  }
  return null;
}

function ensureCell(doc: XMLDocument, rowEl: Element, ref: string): Element {
  const col = ref.replace(/\d+/, '');
  const targetCol = colToNum(col);
  for (const cell of Array.from(rowEl.getElementsByTagNameNS(SSML, 'c'))) {
    if (cell.getAttribute('r') === ref) return cell;
  }
  // Create the cell, keeping columns in order
  const cell = doc.createElementNS(SSML, 'c');
  cell.setAttribute('r', ref);
  let anchor: Element | null = null;
  for (const existing of Array.from(rowEl.getElementsByTagNameNS(SSML, 'c'))) {
    const em = /^([A-Z]+)(\d+)$/.exec(existing.getAttribute('r') ?? '');
    if (em && colToNum(em[1]) > targetCol) {
      anchor = existing;
      break;
    }
  }
  rowEl.insertBefore(cell, anchor);
  return cell;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
