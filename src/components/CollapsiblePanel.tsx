import { ReactNode, useState } from 'react';

const KEY = 'mrf-generator/collapsed';

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

interface Props {
  /** Stable id used to persist the collapsed state. */
  id: string;
  /** Extra card classes, e.g. "card-wizard". */
  className: string;
  title: ReactNode;
  children: ReactNode;
}

/** A group-box panel whose body can be collapsed via its header. */
export function CollapsiblePanel({ id, className, title, children }: Props) {
  const [open, setOpen] = useState(() => loadCollapsed()[id] !== true);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      const state = loadCollapsed();
      state[id] = !next;
      localStorage.setItem(KEY, JSON.stringify(state));
      return next;
    });
  };

  return (
    <section className={`card ${className} ${open ? '' : 'panel-closed'}`}>
      <div
        className="panel-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        title={open ? 'Collapse' : 'Expand'}
      >
        <h2 className="panel-title">{title}</h2>
        <span className={`chevron ${open ? 'open' : ''}`}>▾</span>
      </div>
      {open && <div className="panel-body">{children}</div>}
    </section>
  );
}
