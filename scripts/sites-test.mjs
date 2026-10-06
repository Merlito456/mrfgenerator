// Headless smoke test for the site masterlist parser.
import { readFileSync } from 'node:fs';

const { parseSitesWorkbook } = await import('../src/lib/sites.ts');

const buf = readFileSync(new URL('../test-sites.xlsx', import.meta.url));
const sites = await parseSitesWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
console.log('sites:', sites.length);
console.log('first:', JSON.stringify(sites[0]));
const withAddr = sites.filter((s) => s.address).length;
console.log('with address:', withAddr);
const min132 = sites.filter((s) => s.siteId.toUpperCase().startsWith('MIN132'));
console.log('MIN132* matches:', JSON.stringify(min132.slice(0, 5)));
