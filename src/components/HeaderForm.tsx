import { useState } from 'react';
import { MrfHeader, SiteInfo } from '../types';
import { CollapsiblePanel } from './CollapsiblePanel';

interface Props {
  header: MrfHeader;
  sites: SiteInfo[];
  onChange: (patch: Partial<MrfHeader>) => void;
  sheetNamePreview: string;
}

export function HeaderForm({ header, sites, onChange, sheetNamePreview }: Props) {
  const byId = new Map(sites.map((s) => [s.siteId.toUpperCase(), s]));
  // Combined display/search value: "PLAID - SITE NAME"
  const combined = new Map(sites.map((s) => [`${s.siteId} - ${s.siteName}`.toUpperCase(), s]));

  /**
   * While typing, the field shows exactly what the user types (no rewriting,
   * no cursor jumps). The site is resolved against the masterlist in the
   * background, and "PLAID - SITE NAME" normalization happens on blur/Enter.
   */
  const [siteText, setSiteText] = useState<string | null>(null);

  const resolveSite = (raw: string): SiteInfo | null => {
    const token = raw.split('-')[0].trim().toUpperCase();
    const match =
      byId.get(raw.trim().toUpperCase()) ??
      combined.get(raw.trim().toUpperCase()) ??
      byId.get(token) ??
      null;
    if (match) {
      // Auto-fill the site name and address (columns B and L of the masterlist)
      onChange({
        siteId: match.siteId,
        siteName: match.siteName,
        siteAddress: match.address || header.siteAddress,
      });
      return match;
    }
    onChange({ siteId: raw.trim(), siteName: '' });
    return null;
  };

  const onSiteIdCommit = () => {
    if (siteText === null) return;
    resolveSite(siteText);
    setSiteText(null); // back to the derived "PLAID - SITE NAME" display
  };

  // The field displays "PLAID - SITE NAME" whenever the site is in the masterlist
  const siteDisplay = (() => {
    const match = byId.get(header.siteId.trim().toUpperCase());
    return match ? `${match.siteId} - ${match.siteName}` : header.siteId;
  })();

  return (
    <CollapsiblePanel id="details" className="card-details" title="MRF Details">
      <div className="grid-2">
        <label>
          Project prefix
          <input
            value={header.projectPrefix}
            onChange={(e) => onChange({ projectPrefix: e.target.value })}
            placeholder="NOKIA-FN"
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={header.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </label>
        <label>
          Sequence no.
          <input
            value={header.seq}
            onChange={(e) => onChange({ seq: e.target.value })}
            placeholder="004"
          />
        </label>
        <label className="full">
          MRF no. {header.mrfAuto && <span className="count">(auto-generated — uncheck to edit)</span>}
          <div className="mrfno-row">
            <input
              value={header.mrfAuto ? sheetNamePreview : header.mrfNo}
              readOnly={header.mrfAuto}
              onChange={(e) => onChange({ mrfNo: e.target.value })}
              placeholder="NOKIA-FN_10052026-001_MIN938-MNUANG_MF2_DNA"
              className={header.mrfAuto ? 'auto' : ''}
            />
            <label className="check autotoggle">
              <input
                type="checkbox"
                checked={header.mrfAuto}
                onChange={(e) =>
                  onChange({
                    mrfAuto: e.target.checked,
                    // seed the manual field with the generated value when switching to manual
                    mrfNo: header.mrfAuto ? sheetNamePreview : header.mrfNo,
                  })
                }
              />
              Auto
            </label>
          </div>
        </label>
        <label>
          Company
          <input
            value={header.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="DNA"
          />
        </label>
        <label>
          From
          <input value={header.from} onChange={(e) => onChange({ from: e.target.value })} />
        </label>
        <label>
          Destination
          <input
            value={header.destination}
            onChange={(e) => onChange({ destination: e.target.value })}
          />
        </label>
        <label>
          Site ID
          <input
            list="site-id-options"
            value={siteText ?? siteDisplay}
            onChange={(e) => {
              setSiteText(e.target.value);
              resolveSite(e.target.value);
            }}
            onBlur={onSiteIdCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder={sites.length ? `Search ${sites.length} sites…` : 'e.g. MIN132-BA'}
          />
          <datalist id="site-id-options">
            {sites.map((s) => (
              <option key={s.siteId} value={`${s.siteId} - ${s.siteName}`}>
                {s.siteName}
              </option>
            ))}
          </datalist>
        </label>
        <label className="full">
          Site address {header.siteId && byId.get(header.siteId.toUpperCase()) && <span className="count">(auto-filled from masterlist, editable)</span>}
          <input
            value={header.siteAddress}
            onChange={(e) => onChange({ siteAddress: e.target.value })}
          />
        </label>
      </div>
      <p className="hint">
        Sheet name: <code>{sheetNamePreview || '—'}</code>
      </p>
    </CollapsiblePanel>
  );
}
