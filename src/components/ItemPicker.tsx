import { useMemo, useState } from 'react';
import { InventoryItem, LineItem } from '../types';
import { CollapsiblePanel } from './CollapsiblePanel';

interface Props {
  items: InventoryItem[];
  onAdd: (item: InventoryItem) => void;
}

export function ItemPicker({ items, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [limit] = useState(50);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (category ? i.category === category : true))
      .filter((i) =>
        q
          ? i.code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
          : true,
      )
      .slice(0, limit);
  }, [items, query, category, limit]);

  return (
    <CollapsiblePanel
      id="items-db"
      className="card-db"
      title={
        <>
          Items Database {items.length > 0 && <span className="count">({items.length})</span>}
        </>
      }
    >
      {items.length === 0 ? (
        <p className="hint">Load an inventory workbook to search items.</p>
      ) : (
        <>
          <div className="picker-controls">
            <input
              className="search"
              placeholder="Search part number or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item code</th>
                  <th>Description</th>
                  <th>UOM</th>
                  <th>Category</th>
                  <th title="Total available (from Summary sheet)">Avail.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.code}>
                    <td className="mono">{item.code}</td>
                    <td className="desc">{item.description}</td>
                    <td>{item.uom}</td>
                    <td>{item.category}</td>
                    <td className="num">{item.available ?? '—'}</td>
                    <td>
                      <button className="small" onClick={() => onAdd(item)}>
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="hint">
                      No matching items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CollapsiblePanel>
  );
}

export function itemToLineItem(item: InventoryItem, id: string): LineItem {
  return {
    id,
    partNumber: item.code,
    description: item.description,
    packageNo: '',
    qtyReq: '1',
    section: 'main',
  };
}
