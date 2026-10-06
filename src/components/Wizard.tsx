import { useEffect, useState } from 'react';
import { CollapsiblePanel } from './CollapsiblePanel';
import {
  DEFAULT_ANSWERS,
  EquipmentType,
  TappingMode,
  WizardAnswers,
} from '../lib/bomRules';

interface Props {
  onBuild: (answers: WizardAnswers) => void;
  /** Reports the selected equipment so the MRF no. can include it. */
  onEquipmentChange?: (equipment: EquipmentType[]) => void;
}

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string }> = [
  { value: 'MF2', label: 'MF2 (Lightspan)' },
  { value: 'DF16', label: 'DF16 (Lightspan)' },
];

export function Wizard({ onBuild, onEquipmentChange }: Props) {
  const [a, setA] = useState<WizardAnswers>({ ...DEFAULT_ANSWERS });
  const patch = (p: Partial<WizardAnswers>) => setA({ ...a, ...p });

  useEffect(() => {
    onEquipmentChange?.(a.equipment);
  }, [a.equipment, onEquipmentChange]);

  const toggleEquipment = (eq: EquipmentType) => {
    const has = a.equipment.includes(eq);
    patch({
      equipment: has ? a.equipment.filter((e) => e !== eq) : [...a.equipment, eq],
    });
  };

  return (
    <CollapsiblePanel id="wizard" className="card-wizard" title="Guided Setup">
      <p className="hint">
        Answer the questions — the MRF line items are built automatically from the database.
        Everything stays editable afterwards.
      </p>

      {/* Q1 — equipment */}
      <fieldset>
        <legend><span className="qnum">1</span>What equipment to install? <span className="count">(included in the MRF no.)</span></legend>
        {EQUIPMENT_OPTIONS.map((o) => (
          <label key={o.value} className="check">
            <input
              type="checkbox"
              checked={a.equipment.includes(o.value)}
              onChange={() => toggleEquipment(o.value)}
            />
            {o.label}
          </label>
        ))}
        <p className="hint">Other equipment can be added manually from the items database.</p>
      </fieldset>

      {/* Q2 — environment */}
      <fieldset>
        <legend><span className="qnum">2</span>Is the site Outdoor or Indoor?</legend>
        <label className="check">
          <input
            type="radio"
            name="env"
            checked={a.environment === 'outdoor'}
            onChange={() => patch({ environment: 'outdoor' })}
          />
          Outdoor
        </label>
        <label className="check">
          <input
            type="radio"
            name="env"
            checked={a.environment === 'indoor'}
            onChange={() => patch({ environment: 'indoor' })}
          />
          Indoor
        </label>
        <p className="hint">Outdoor sites use 25 PA LTC for the power cable and 15 PA for the uplink.</p>
      </fieldset>

      {/* Q3 — transport equipment (outdoor only) */}
      {a.environment === 'outdoor' && (
        <fieldset>
          <legend><span className="qnum">3</span>Is the Transport Equipment located outside the proposed OLT location?</legend>
          <label className="check">
            <input
              type="radio"
              name="transport"
              checked={!a.transportOutside}
              onChange={() => patch({ transportOutside: false })}
            />
            No
          </label>
          <label className="check">
            <input
              type="radio"
              name="transport"
              checked={a.transportOutside}
              onChange={() => patch({ transportOutside: true })}
            />
            Yes
          </label>
          {a.transportOutside && (
            <label>
              Distance (m)
              <input
                type="number"
                min={0}
                value={a.transportDistance}
                onChange={(e) => patch({ transportDistance: Number(e.target.value) })}
              />
            </label>
          )}
          <p className="hint">
            Yes → 15 PA LTC (meters = the distance) + 2× 15 PA connector + uplink patch cord
            (smallest of 3/5/8 m exceeding the distance). No → none.
          </p>
        </fieldset>
      )}

      {/* Q4 — tapping point */}
      <fieldset>
        <legend><span className="qnum">4</span>Is the tapping point separated from the OLT location?</legend>
        <select
          value={a.tapping}
          onChange={(e) => patch({ tapping: e.target.value as TappingMode })}
        >
          <option value="none">No — standard feed at the OLT</option>
          <option value="single">Yes — just 1 (single cable)</option>
          <option value="two">Yes — both, separate RS1 &amp; RS2</option>
          <option value="same">Yes — both, same RS (laid together)</option>
        </select>
        {a.tapping === 'single' && (
          <label>
            Distance OLT → RS (m)
            <input
              type="number"
              min={0}
              value={a.distSingle}
              onChange={(e) => patch({ distSingle: Number(e.target.value) })}
            />
          </label>
        )}
        {a.tapping === 'two' && (
          <>
            <label>
              Distance OLT → RS1 (m)
              <input
                type="number"
                min={0}
                value={a.distRs1}
                onChange={(e) => patch({ distRs1: Number(e.target.value) })}
              />
            </label>
            <label>
              Distance OLT → RS2 (m)
              <input
                type="number"
                min={0}
                value={a.distRs2}
                onChange={(e) => patch({ distRs2: Number(e.target.value) })}
              />
            </label>
          </>
        )}
        {a.tapping === 'same' && (
          <label>
            Distance OLT → RS (m)
            <input
              type="number"
              min={0}
              value={a.distSame}
              onChange={(e) => patch({ distSame: Number(e.target.value) })}
            />
          </label>
        )}
        <p className="hint">
          Power cable length must exceed the distance (10/15/20 m in the database), plus 25 PA
          LTC and connectors.
        </p>
      </fieldset>

      {/* Q5 — grounding */}
      <fieldset>
        <legend><span className="qnum">5</span>How long is the grounding cable?</legend>
        <label>
          Length (m)
          <input
            type="number"
            min={0}
            value={a.groundingLength}
            onChange={(e) => patch({ groundingLength: Number(e.target.value) })}
          />
        </label>
        <p className="hint">No LTC. Uses 3 m / 5 m / 15 m items, whichever exceeds the distance.</p>
      </fieldset>

      {/* Q6 — breakers */}
      <fieldset>
        <legend><span className="qnum">6</span>Does the RS need change breakers?</legend>
        <label className="check">
          <input
            type="radio"
            name="breakers"
            checked={!a.breakersNeeded}
            onChange={() => patch({ breakersNeeded: false })}
          />
          No
        </label>
        <label className="check">
          <input
            type="radio"
            name="breakers"
            checked={a.breakersNeeded}
            onChange={() => patch({ breakersNeeded: true })}
          />
          Yes
        </label>
        {a.breakersNeeded && (
          <div className="grid-3">
            <label>
              How many?
              <input
                type="number"
                min={1}
                value={a.breakerQty}
                onChange={(e) => patch({ breakerQty: Number(e.target.value) })}
              />
            </label>
            <label>
              Rating
              <select
                value={a.breakerRating}
                onChange={(e) => patch({ breakerRating: Number(e.target.value) })}
              >
                {[6, 16, 20, 25, 32, 40, 63].map((r) => (
                  <option key={r} value={r}>
                    {r} A
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brand
              <select
                value={a.breakerBrand}
                onChange={(e) => patch({ breakerBrand: e.target.value as WizardAnswers['breakerBrand'] })}
              >
                <option value="NADER">NADER</option>
                <option value="SCHNEIDER">SCHNEIDER</option>
              </select>
            </label>
          </div>
        )}
      </fieldset>

      {/* Q7 — downlink */}
      <fieldset>
        <legend><span className="qnum">7</span>How long is the downlink cable?</legend>
        <select
          value={a.downlinkLength}
          onChange={(e) => patch({ downlinkLength: Number(e.target.value) })}
        >
          {[1.5, 2, 3, 5, 8, 10, 15].map((l) => (
            <option key={l} value={l}>
              {l} m{l === 2 ? ' (suggested — ODF just below the equipment)' : ''}
            </option>
          ))}
        </select>
      </fieldset>

      {/* Q8 — LT cards (MF2 only) */}
      {a.equipment.includes('MF2') && (
        <fieldset>
          <legend><span className="qnum">8</span>How many LT cards (MF2)?</legend>
          <select
            value={a.ltCards}
            onChange={(e) => patch({ ltCards: Number(e.target.value) as 1 | 2 })}
          >
            <option value={2}>2 — 16 GPON + 16 XGS-PON</option>
            <option value={1}>1 — 8 GPON + 8 XGS-PON + universal dummy plate</option>
          </select>
          <label className="check">
            <input
              type="checkbox"
              checked={a.swStaged}
              onChange={(e) => patch({ swStaged: e.target.checked })}
            />
            LWLT-C is SW staged (uses 3FE76353AA-S)
          </label>
        </fieldset>
      )}

      <button className="primary" onClick={() => onBuild(a)}>
        Build line items
      </button>
    </CollapsiblePanel>
  );
}
