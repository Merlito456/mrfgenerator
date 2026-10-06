import { MrfDraft } from '../types';

const KEY = 'mrf-generator/drafts';
const SEQ_KEY = 'mrf-generator/seq';

export function loadDrafts(): MrfDraft[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MrfDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: MrfDraft[]): void {
  localStorage.setItem(KEY, JSON.stringify(drafts));
}

export function nextSeq(): string {
  const n = Number(localStorage.getItem(SEQ_KEY) ?? '0') + 1;
  localStorage.setItem(SEQ_KEY, String(n));
  return String(n).padStart(3, '0');
}

export function peekNextSeq(): string {
  const n = Number(localStorage.getItem(SEQ_KEY) ?? '0') + 1;
  return String(n).padStart(3, '0');
}

const BG_KEY = 'mrf-generator/bg';

export interface BgPreference {
  key: string; // preset key or 'custom'
  color?: string; // hex, for custom
}

export function loadBg(): BgPreference {
  try {
    const raw = localStorage.getItem(BG_KEY);
    return raw ? (JSON.parse(raw) as BgPreference) : { key: 'default' };
  } catch {
    return { key: 'default' };
  }
}

export function saveBg(pref: BgPreference): void {
  localStorage.setItem(BG_KEY, JSON.stringify(pref));
}
