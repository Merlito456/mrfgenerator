import { MrfDraft, buildSheetName } from '../types';
import { CollapsiblePanel } from './CollapsiblePanel';

interface Props {
  drafts: MrfDraft[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function DraftList({ drafts, currentId, onSelect, onNew, onDelete }: Props) {
  return (
    <CollapsiblePanel
      id="drafts"
      className="card-drafts"
      title={
        <>
          Saved MRFs
          <button
            className="small"
            style={{ marginLeft: 8 }}
            onClick={(e) => {
              e.stopPropagation();
              onNew();
            }}
          >
            + New
          </button>
        </>
      }
    >
      {drafts.length === 0 ? (
        <p className="hint">No saved MRFs yet.</p>
      ) : (
        <ul className="draft-list">
          {drafts.map((d) => (
            <li key={d.id} className={d.id === currentId ? 'active' : ''}>
              <button className="link" onClick={() => onSelect(d.id)}>
                {buildSheetName(d.header) || 'Untitled'}{' '}
                <span className="count">({d.items.length} items)</span>
              </button>
              <button
                className="small danger"
                title="Delete draft"
                onClick={() => onDelete(d.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </CollapsiblePanel>
  );
}
