// Headless smoke test for the MRF generator.
// Runs the real generator code against the dev-server template, then writes the
// result to disk so it can be inspected with openpyxl.
import { JSDOM } from 'jsdom';
import { writeFileSync } from 'node:fs';

const dom = new JSDOM('');
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;

const { generateMrfWorkbook } = await import('../src/lib/generator.ts');
const { DEFAULT_HEADER } = await import('../src/types.ts');

const header = {
  ...DEFAULT_HEADER,
  date: '2026-09-15',
  seq: '004',
  destination: 'Blaine OLT',
  siteId: 'MIN132-BA',
  siteName: 'BABAK',
  siteAddress: '123 Test St, Paranaque',
  equipmentLabel: 'MF2',
  company: 'DNA',
  mrfAuto: true,
  mrfNo: '',
};

const items = [
  { id: '1', partNumber: '3FE47581AB', description: 'Transcvr XGS-PON/GPON MPM B+(28dBm)Ctemp', packageNo: 'PKG-1', qtyReq: '8', section: 'main' },
  { id: '2', partNumber: '3FE76762AA', description: 'Lightspan MF-2 shelf incl. fan unit (LMXR-A)', packageNo: 'PKG-2', qtyReq: '1', section: 'main' },
  { id: '3', partNumber: '1AB032050013', description: 'LUG*RING*CRIMP_UNINSUL*9mm*8mm (Brand: LONGYI)', packageNo: '', qtyReq: '50', section: 'local' },
  { id: '4', partNumber: '1AZ661980001', description: 'HT RVVZ Single Ground Cable 16mm2 (Yellow/Green) (Brand: Swell)', packageNo: '', qtyReq: '10', section: 'local' },
];

const { blob, fileName } = await generateMrfWorkbook('http://localhost:5175/templates/MRF_template.xlsx', header, items);
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync(new URL('../test-output.xlsx', import.meta.url), buf);
console.log('OK', fileName, buf.length, 'bytes');
