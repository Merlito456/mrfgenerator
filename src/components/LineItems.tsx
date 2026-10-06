import { LineItem, Section } from '../types';

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

const SECTION_LABEL: Record<Section, string> = {
  main: 'Equipment / Materials',
  local: 'Local Materials / Accessories',
};

const SECTION_CAP: Record<Section, number> = { main: 8, local: 20 };

export function LineItems({ items, onChange }: Props) {
  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onChange(copy);
  };

  const changeSection = (id: string, section: Section) => {
    const count = items.filter((i) => i.section === section).length;
    const item = items.find((i) => i.id === id);
    if (item && item.section !== section && count >= SECTION_CAP[section]) {
      alert(`${SECTION_LABEL[section]} is limited to ${SECTION_CAP[section]} rows on the form.`);
      return;
    }
    update(id, { section });
  };

  const renderSection = (section: Section) => {
    const rows = items.filter((i) => i.section === section);
    return (
      <div className="section-block">
        <h3>
          {SECTION_LABEL[section]}{' '}
          <span className="count">
            {rows.length}/{SECTION_CAP[section]} rows
          </span>
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Part number</th>
                <th>Description</th>
                <th style={{ width: 90 }}>Package no.</th>
                <th style={{ width: 80 }}>Qty req</th>
                <th style={{ width: 130 }}>Section</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="mono"
                      value={item.partNumber}
                      onChange={(e) => update(item.id, { partNumber: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={item.description}
                      onChange={(e) => update(item.id, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={item.packageNo}
                      onChange={(e) => update(item.id, { packageNo: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="num"
                      value={item.qtyReq}
                      onChange={(e) => update(item.id, { qtyReq: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={item.section}
                      onChange={(e) => changeSection(item.id, e.target.value as Section)}
                    >
                      <option value="main">Main</option>
                      <option value="local">Local</option>
                    </select>
                  </td>
                  <td className="actions">
                    <button className="small" title="Move up" onClick={() => move(item.id, -1)}>
                      ↑
                    </button>
                    <button className="small" title="Move down" onClick={() => move(item.id, 1)}>
                      ↓
                    </button>
                    <button className="small danger" onClick={() => remove(item.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="hint">
                    No items. Add from the database on the left.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <section className="card card-lines">
      <h2 className="panel-title">Line Items</h2>
      {renderSection('main')}
      {renderSection('local')}
    </section>
  );
}
