import { AppLogo } from './AppLogo';

interface Props {
  onClose: () => void;
}

const FEATURES = [
  'Guided 8-question setup that builds the complete bill of materials automatically (equipment, LTC, cables, breakers, patch cords).',
  'Searchable items database — the Blaine-OLT Material Master List with live stock availability from the Summary sheet.',
  'Site ID autocomplete across 3,400+ sites with automatic site-address lookup from the GLOBE SITE MASTERLIST.',
  'Generates MRFs directly from the official Excel template — logo, borders, fonts and print setup are preserved exactly.',
  'Standardized sheet naming (e.g. NOKIA-FN_09152026-004_MIN132-BA) consistent with the Equipment Allocation Tracker.',
  'Draft saving and reloading — prepare an MRF now, finish it later.',
  'Editable line items with built-in form capacity checks (8 equipment rows + 20 local materials rows).',
  'Cable-length, LTC and breaker rules built in — distances always map to the correct items in the database.',
];

const ADVANTAGES = [
  'Minutes instead of an hour — no more copying part numbers and descriptions from spreadsheets.',
  'No wrong or misspelled items — every line comes straight from the Material Master List.',
  'Nothing forgotten — the standard install kit and per-port quantities are always included.',
  'Correct cable and LTC lengths are computed from site distances automatically.',
  'Consistent, searchable file naming for every generated MRF.',
  'Capacity checks prevent overflowing the printed form before it is generated.',
  'Repeatable and auditable — the same answers always produce the same complete MRF.',
];

export function AboutDialog({ onClose }: Props) {
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-window" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="dialog-titlebar">
          <span>About MRF Generator</span>
          <button className="win-btn close" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="dialog-content">
          <div className="about-header">
            <AppLogo size={56} />
            <div>
              <h1>MRF Generator</h1>
              <p className="about-version">Version 1.0.0 — Material Request Form automation for OLT rollout</p>
            </div>
          </div>

          <div className="about-columns">
            <section>
              <h2>Features</h2>
              <ul>
                {FEATURES.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Advantages over manual MRF creation</h2>
              <ul>
                {ADVANTAGES.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="about-developer">
            <h2>Developer</h2>
            <p className="dev-name">Engr. John Carlo Rabanes, ECE</p>
            <p>Nokia Shanghai Bell</p>
            <p>OLT Rollout Engineer</p>
            <p className="about-copy">© 2026 Engr. John Carlo Rabanes. All rights reserved.</p>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="primary" onClick={onClose} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
