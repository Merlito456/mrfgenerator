import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { MenuBar } from './components/MenuBar';
import { AboutDialog } from './components/AboutDialog';
import { HeaderForm } from './components/HeaderForm';
import { ItemPicker, itemToLineItem } from './components/ItemPicker';
import { LineItems } from './components/LineItems';
import { DraftList } from './components/DraftList';
import { Wizard } from './components/Wizard';
import { buildBom, checkCapacity, WizardAnswers } from './lib/bomRules';
import { parseInventoryWorkbook } from './lib/inventory';
import { parseSitesWorkbook } from './lib/sites';
import { generateMrfWorkbook } from './lib/generator';
import { loadDrafts, saveDrafts, peekNextSeq, nextSeq, loadBg, saveBg, BgPreference } from './lib/storage';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Save the workbook on disk through the app's own server (works even when the
 * browser blocks downloads). Returns the written file path, or null. */
async function serverSave(blob: Blob, fileName: string): Promise<string | null> {
  try {
    const res = await fetch('/api/save-mrf', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'x-filename': encodeURIComponent(fileName),
        'x-reveal': '1',
      },
      body: blob,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; path?: string };
    return data.ok && data.path ? data.path : null;
  } catch {
    return null;
  }
}

interface DeliveryResult {
  downloaded: boolean; // browser download started (cannot be verified)
  savedPath: string | null; // file written on disk by the app server
  method: 'saved' | 'downloaded' | 'opened' | 'cancelled' | 'failed';
}

/**
 * Deliver the generated workbook to the user, trying several strategies because
 * some embedded browsers block programmatic downloads:
 * 1. anchor[download] click — classic browser download (unverifiable)
 * 2. app-server disk save — guaranteed copy on disk
 * 3. File System Access API — native "Save As" dialog (Chromium)
 * 4. open the blob in a new tab — manual save fallback
 */
async function deliverWorkbook(blob: Blob, fileName: string): Promise<DeliveryResult> {
  if (blob.size === 0) throw new Error('The generated workbook is empty — generation failed.');

  const result: DeliveryResult = { downloaded: false, savedPath: null, method: 'failed' };

  // 1. classic browser download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    result.downloaded = true;
  } catch {
    // ignore — the other strategies cover this
  }

  // 2. guaranteed disk copy via the app server
  result.savedPath = await serverSave(blob, fileName);

  if (result.downloaded || result.savedPath) {
    result.method = result.savedPath ? 'saved' : 'downloaded';
    return result;
  }

  // 3. File System Access API — native Save As dialog
  const w = window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<{
      createWritable: () => Promise<{
        write: (d: BufferSource | Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Excel workbook', accept: { [XLSX_MIME]: ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(await blob.arrayBuffer()); // BufferSource — more reliable than Blob
      await writable.close();
      result.method = 'saved';
      return result;
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') {
        result.method = 'cancelled';
        return result;
      }
      // otherwise fall through
    }
  }

  // 4. open in a new tab for manual save
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (tab) {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    result.method = 'opened';
    return result;
  }
  URL.revokeObjectURL(url);
  throw new Error('The browser blocked the download. Allow downloads/pop-ups for this page and try again.');
}
import {
  DEFAULT_HEADER,
  InventoryItem,
  LineItem,
  MrfDraft,
  MrfHeader,
  SiteInfo,
  buildSheetName,
} from './types';

/** Background presets for the window chrome. */
const BG_PRESETS: Record<string, { label: string; chrome: string; desktop: string; sep: string; text: string; hover: string }> = {
  default: { label: 'Default gray', chrome: '#f3f3f3', desktop: '#dfdfdf', sep: '#e4e4e4', text: '#1b1b1b', hover: '#e9e9e9' },
  blue: { label: 'Blue', chrome: '#e8f1fb', desktop: '#c7dcee', sep: '#cfdff0', text: '#173d5c', hover: '#d5e5f5' },
  green: { label: 'Green', chrome: '#e8f6ee', desktop: '#c9e6d4', sep: '#cfe8da', text: '#1c452c', hover: '#d7eee0' },
  purple: { label: 'Purple', chrome: '#f4ecfa', desktop: '#ddc9ec', sep: '#e4d4ef', text: '#43265c', hover: '#e9dcf4' },
  warm: { label: 'Warm sand', chrome: '#fdf3e7', desktop: '#eed9c0', sep: '#f0e0cc', text: '#4d3319', hover: '#f5e7d4' },
  dark: { label: 'Dark', chrome: '#2b2b2b', desktop: '#171717', sep: '#3d3d3d', text: '#e8e8e8', hover: '#3d3d3d' },
};

/** Pick readable text for a custom background color. */
function textFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#1b1b1b';
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 140 ? '#1b1b1b' : '#e8e8e8';
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** Linear blend of two hex colors; t = 0 → a, t = 1 → b. */
function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Derive the full panel palette from the chrome background so panels, tables,
 * inputs and buttons follow the chosen background color — with text that stays
 * readable in both light and dark variants.
 */
function panelVars(chrome: string, dark: boolean): Record<string, string> {
  const W = '#ffffff';
  const B = '#000000';
  if (!dark) {
    const panel = mixHex(chrome, W, 0.65);
    const border = mixHex(panel, '#5b6b7c', 0.3);
    return {
      '--panel': panel,
      '--panel-border': border,
      '--text': '#1b1b1b',
      '--text-dim': '#5f6b7a',
      '--selected': mixHex(chrome, '#3b82f6', 0.28),
      '--row-alt': mixHex(panel, W, 0.5),
      '--row-hover': mixHex(chrome, W, 0.45),
      '--row-border': mixHex(panel, '#94a3b8', 0.16),
      '--table-head-bg': mixHex(chrome, W, 0.55),
      '--table-head-text': mixHex(chrome, '#173d5c', 0.55),
      '--input-bg': '#ffffff',
      '--input-border': mixHex(panel, '#5b6b7c', 0.45),
      '--input-hover-border': mixHex(panel, '#5b6b7c', 0.65),
      '--btn-bg': mixHex(panel, W, 0.55),
      '--btn-border': mixHex(panel, '#5b6b7c', 0.3),
      '--btn-hover': mixHex(panel, '#5b6b7c', 0.08),
      '--btn-hover-border': mixHex(panel, '#5b6b7c', 0.45),
      '--btn-text': '#1b1b1b',
      '--field-border': mixHex(panel, '#94a3b8', 0.25),
      '--field-hover-border': mixHex(panel, '#3b82f6', 0.35),
      '--field-hover-bg': mixHex(panel, W, 0.6),
      '--chip-bg': mixHex(panel, '#94a3b8', 0.15),
      '--dropdown-bg': mixHex(panel, W, 0.4),
      '--callout-bg': mixHex(panel, '#7a3fa3', 0.08),
      '--callout-border': mixHex(panel, '#7a3fa3', 0.3),
      '--scroll-thumb': mixHex(panel, '#5b6b7c', 0.35),
      '--scroll-thumb-hover': mixHex(panel, '#5b6b7c', 0.55),
    };
  }
  const panel = mixHex(chrome, B, 0.22);
  return {
    '--panel': panel,
    '--panel-border': mixHex(chrome, W, 0.16),
    '--text': '#ececec',
    '--text-dim': '#9aa4b0',
    '--selected': mixHex(chrome, '#3b82f6', 0.4),
    '--row-alt': mixHex(panel, W, 0.05),
    '--row-hover': mixHex(chrome, '#3b82f6', 0.22),
    '--row-border': mixHex(panel, W, 0.09),
    '--table-head-bg': mixHex(chrome, W, 0.1),
    '--table-head-text': mixHex(chrome, W, 0.8),
    '--input-bg': mixHex(chrome, B, 0.25),
    '--input-border': mixHex(chrome, W, 0.28),
    '--input-hover-border': mixHex(chrome, W, 0.45),
    '--btn-bg': mixHex(chrome, W, 0.1),
    '--btn-border': mixHex(chrome, W, 0.22),
    '--btn-hover': mixHex(chrome, W, 0.18),
    '--btn-hover-border': mixHex(chrome, W, 0.3),
    '--btn-text': '#f2f2f2',
    '--field-border': mixHex(chrome, W, 0.18),
    '--field-hover-border': mixHex(chrome, '#3b82f6', 0.55),
    '--field-hover-bg': mixHex(chrome, '#3b82f6', 0.1),
    '--chip-bg': mixHex(chrome, W, 0.12),
    '--dropdown-bg': mixHex(chrome, W, 0.08),
    '--callout-bg': mixHex(chrome, '#7a3fa3', 0.18),
    '--callout-border': mixHex(chrome, '#7a3fa3', 0.5),
    '--scroll-thumb': mixHex(chrome, W, 0.25),
    '--scroll-thumb-hover': mixHex(chrome, W, 0.4),
    // lightened accent hues for readability on dark surfaces
    '--h-wizard': '#5fd4d4',
    '--h-details': '#7cb8ff',
    '--h-db': '#ffab5e',
    '--h-lines': '#7ee2a8',
    '--h-drafts': '#d0a7ef',
    '--h-features': '#7cb8ff',
    '--h-advantages': '#7ee2a8',
    '--c-wizard-bg': mixHex(chrome, '#0e8a8a', 0.35),
    '--c-details-bg': mixHex(chrome, '#0067c0', 0.35),
    '--c-db-bg': mixHex(chrome, '#b45309', 0.35),
    '--c-lines-bg': mixHex(chrome, '#16a34a', 0.35),
    '--c-drafts-bg': mixHex(chrome, '#7a3fa3', 0.35),
    '--ok': '#7ee2a8',
    '--num': '#ffab5e',
    '--link': '#6cb6ff',
    '--cell-pos': '#7ee2a8',
    '--cell-sites': '#d0a7ef',
    '--cell-sheet': '#6cb6ff',
    '--banner-bg': '#3a3020',
    '--banner-border': '#5a4c2a',
    '--banner-err-bg': '#3a2020',
    '--banner-err-border': '#5a3030',
    '--danger': '#ff8a80',
    '--danger-hover-bg': mixHex(chrome, '#c42b1c', 0.3),
    '--danger-hover-border': mixHex(chrome, '#c42b1c', 0.6),
  };
}

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [dbError, setDbError] = useState('');
  const [header, setHeader] = useState<MrfHeader>({ ...DEFAULT_HEADER, seq: peekNextSeq() });
  const [lines, setLines] = useState<LineItem[]>([]);
  const [drafts, setDrafts] = useState<MrfDraft[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  const [busy, setBusy] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [bg, setBgState] = useState<BgPreference>(() => loadBg());
  const colorInputRef = useRef<HTMLInputElement>(null);

  const setBg = (pref: BgPreference) => {
    setBgState(pref);
    saveBg(pref);
  };

  // Apply the background preference to the window chrome AND all inner panels
  useEffect(() => {
    const preset = BG_PRESETS[bg.key];
    const chrome = bg.key === 'custom' ? bg.color ?? '#f3f3f3' : preset?.chrome ?? '#f3f3f3';
    const isCustom = bg.key === 'custom';
    const dark = isCustom ? (() => {
      const [r, g, b] = hexRgb(chrome);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 120;
    })() : bg.key === 'dark';
    const text = isCustom ? textFor(chrome) : preset?.text ?? '#1b1b1b';
    const sep = isCustom
      ? text === '#1b1b1b'
        ? 'rgba(0,0,0,0.12)'
        : 'rgba(255,255,255,0.16)'
      : preset?.sep ?? '#e4e4e4';
    const hover = isCustom ? (text === '#1b1b1b' ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.09)') : preset?.hover ?? '#e9e9e9';
    const desktop = isCustom ? chrome : preset?.desktop ?? '#dfdfdf';
    const root = document.documentElement;
    root.style.setProperty('--chrome', chrome);
    root.style.setProperty('--chrome-sep', sep);
    root.style.setProperty('--chrome-text', text);
    root.style.setProperty('--hover', hover);
    document.body.style.background = desktop;
    // Panels, tables, inputs and buttons follow the background color
    for (const [k, v] of Object.entries(panelVars(chrome, dark))) {
      root.style.setProperty(k, v);
    }
  }, [bg]);

  useEffect(() => setDrafts(loadDrafts()), []);

  // Prefer the masterlist site name for the MRF no. (PLAID-SiteName segment)
  const matchedSite = useMemo(
    () => sites.find((s) => s.siteId.toUpperCase() === header.siteId.trim().toUpperCase()),
    [sites, header.siteId],
  );
  const sheetNamePreview = useMemo(
    () =>
      buildSheetName({
        ...header,
        siteName: header.siteName || matchedSite?.siteName || '',
      }),
    [header, matchedSite],
  );

  const onEquipmentChange = useCallback(
    (eq: string[]) => {
      const label = eq.join('-');
      setHeader((h) => (h.equipmentLabel === label ? h : { ...h, equipmentLabel: label }));
    },
    [],
  );

  const loadDb = useCallback(
    async (getSource: () => Promise<{ data: ArrayBuffer; name: string }>) => {
      setBusy(true);
      setDbError('');
      try {
        const { data, name } = await getSource();
        const parsed = await parseInventoryWorkbook(data);
        setItems(parsed);
        setStatus(`Loaded ${parsed.length} items from ${name}`);
      } catch (e) {
        setDbError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Auto-load the bundled materials database on startup
  useEffect(() => {
    loadDb(async () => {
      const res = await fetch('/data/blaine-inventory.xlsx');
      if (!res.ok) throw new Error(`Default database not available (${res.status})`);
      return { data: await res.arrayBuffer(), name: 'Blaine-OLT Inventory (bundled)' };
    });
  }, [loadDb]);

  // Auto-load the bundled site masterlist (GLOBE SITE MASTERLIST: PLAID + SITE_ADD at column L)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/data/sites-masterlist.xlsx');
        if (!res.ok) throw new Error(`Site masterlist not available (${res.status})`);
        setSites(await parseSitesWorkbook(await res.arrayBuffer()));
      } catch (e) {
        setDbError(`Site masterlist: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, []);

  const buildFromWizard = (answers: WizardAnswers) => {
    if (items.length === 0) {
      setStatus('Error: items database not loaded yet.');
      return;
    }
    const { lines: bom, warnings } = buildBom(answers, items);
    const capacityErrors = checkCapacity(bom);
    if (capacityErrors.length > 0) {
      setStatus(`Error: ${capacityErrors.join(' ')}`);
      return;
    }
    if (
      lines.length > 0 &&
      !confirm(`Replace the current ${lines.length} line items with the ${bom.length} generated items?`)
    ) {
      return;
    }
    setLines(bom);
    setStatus(
      `Built ${bom.length} line items from your answers.${warnings.length ? ' Warnings: ' + warnings.join(' ') : ''}`,
    );
  };

  const addItem = (item: InventoryItem) => {
    setLines((prev) => {
      if (prev.some((l) => l.partNumber.toUpperCase() === item.code.toUpperCase())) {
        setStatus(`${item.code} is already on this MRF.`);
        return prev;
      }
      return [...prev, itemToLineItem(item, crypto.randomUUID())];
    });
  };

  const saveDraft = () => {
    const now = Date.now();
    const draft: MrfDraft = { id: currentId ?? crypto.randomUUID(), header, items: lines, updatedAt: now };
    const next = [draft, ...drafts.filter((d) => d.id !== draft.id)];
    setDrafts(next);
    saveDrafts(next);
    setCurrentId(draft.id);
    setStatus('Draft saved.');
  };

  const newDraft = () => {
    setHeader({ ...DEFAULT_HEADER, seq: nextSeq() });
    setLines([]);
    setCurrentId(null);
    setStatus('New MRF started.');
  };

  const selectDraft = (id: string) => {
    const d = drafts.find((x) => x.id === id);
    if (!d) return;
    setHeader(d.header);
    setLines(d.items);
    setCurrentId(d.id);
    setStatus(`Loaded draft ${buildSheetName(d.header)}.`);
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    saveDrafts(next);
    if (currentId === id) setCurrentId(null);
  };

  const generate = async () => {
    if (lines.length === 0) {
      // confirm() may be unavailable in some embedded browsers — never block on it silently
      let ok = true;
      try {
        ok = window.confirm('No line items yet — generate an empty MRF anyway?') !== false;
      } catch {
        ok = true;
      }
      if (!ok) {
        setStatus('Generation cancelled.');
        return;
      }
    }
    setBusy(true);
    try {
      // Fill the original template (logo, borders and print setup preserved)
      const effectiveHeader = { ...header, siteName: header.siteName || matchedSite?.siteName || '' };
      const { blob, fileName } = await generateMrfWorkbook('/templates/MRF_template.xlsx', effectiveHeader, lines);
      const delivery = await deliverWorkbook(blob, fileName);
      if (delivery.method === 'saved' && delivery.savedPath) {
        setStatus(
          `Delivered: ${fileName} — copied to your Downloads folder (revealed in Explorer) and archived to ${delivery.savedPath}`,
        );
      } else if (delivery.method === 'saved') {
        setStatus(`Saved ${fileName}.`);
      } else if (delivery.method === 'downloaded') {
        setStatus(`Generated ${fileName} — check your Downloads folder.`);
      } else if (delivery.method === 'opened') {
        setStatus(`Opened ${fileName} in a new tab — use Save there if the download did not start.`);
      } else if (delivery.method === 'cancelled') {
        setStatus('Save cancelled.');
      }
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const itemCount = lines.length;

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        newDraft();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraft();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setAboutOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="win" data-bg={bg.key}>
      <TitleBar />
      <MenuBar
        menus={[
          {
            label: 'File',
            items: [
              { label: 'New MRF', shortcut: 'Ctrl+N', action: newDraft },
              { label: 'Save Draft', shortcut: 'Ctrl+S', action: saveDraft },
              { separator: true },
              { label: busy ? 'Generating…' : 'Generate MRF…', action: generate, disabled: busy },
              { separator: true },
              { label: 'Exit', action: () => window.close() },
            ],
          },
          {
            label: 'View',
            items: [
              ...Object.entries(BG_PRESETS).map(([key, p]) => ({
                label: `${bg.key === key ? '✓' : '   '} ${p.label}`,
                action: () => setBg({ key }),
              })),
              { separator: true },
              {
                label: `${bg.key === 'custom' ? '✓' : '   '} Custom color…`,
                action: () => colorInputRef.current?.click(),
              },
            ],
          },
          {
            label: 'Help',
            items: [
              { label: 'About MRF Generator', shortcut: 'F1', action: () => setAboutOpen(true) },
            ],
          },
        ]}
      />
      <div className="toolbar">
        <button className="tool-btn" onClick={newDraft} title="New MRF (Ctrl+N)">
          <svg className="icon-new" viewBox="0 0 16 16" width="16" height="16"><path d="M3 1h6l4 4v10H3z" fill="none" stroke="currentColor" /><path d="M9 1v4h4" fill="none" stroke="currentColor" /><path d="M5.5 9h5M8 6.5v5" stroke="currentColor" /></svg>
          New
        </button>
        <button className="tool-btn" onClick={saveDraft} title="Save draft (Ctrl+S)">
          <svg className="icon-save" viewBox="0 0 16 16" width="16" height="16"><path d="M2 2h9l3 3v9H2z" fill="none" stroke="currentColor" /><rect x="5" y="2" width="6" height="4" fill="none" stroke="currentColor" /><rect x="4" y="8" width="8" height="6" fill="none" stroke="currentColor" /></svg>
          Save
        </button>
        <div className="tool-sep" />
        <button className="tool-btn accent" disabled={busy} onClick={generate} title="Generate the MRF Excel file">
          <svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M12 2h2v12h-2" fill="none" stroke="currentColor" /></svg>
          {busy ? 'Generating…' : 'Generate MRF'}
        </button>
        <div className="toolbar-spacer" />
        <span className="toolbar-info">{itemCount} line item{itemCount === 1 ? '' : 's'}</span>
      </div>

      {dbError && <div className="status error">{dbError}</div>}

      <main className="work-area">
        <div className="col">
          <Wizard onBuild={buildFromWizard} onEquipmentChange={onEquipmentChange} />
          <HeaderForm header={header} sites={sites} onChange={(patch) => setHeader({ ...header, ...patch })} sheetNamePreview={sheetNamePreview} />
          <DraftList drafts={drafts} currentId={currentId} onSelect={selectDraft} onNew={newDraft} onDelete={deleteDraft} />
        </div>
        <div className="col">
          <ItemPicker items={items} onAdd={addItem} />
          <LineItems items={lines} onChange={setLines} />
        </div>
      </main>

      <footer className="statusbar">
        <span className="status-cell grow">{busy ? 'Working…' : status || 'Ready'}</span>
        <span className="status-cell cell-db">{items.length} items in database</span>
        <span className="status-cell cell-sites">{sites.length} sites</span>
        <span className="status-cell cell-sheet" title="Output sheet name">{sheetNamePreview || '—'}</span>
      </footer>

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}

      {/* Hidden color picker for View → Custom background color */}
      <input
        ref={colorInputRef}
        type="color"
        value={bg.key === 'custom' && bg.color ? bg.color : '#f3f3f3'}
        style={{ position: 'fixed', left: -100, top: -100, width: 1, height: 1, opacity: 0.01 }}
        onChange={(e) => setBg({ key: 'custom', color: e.target.value })}
      />
    </div>
  );
}
