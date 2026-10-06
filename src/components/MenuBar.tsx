import { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

interface Props {
  menus: Array<{ label: string; items: MenuItem[] }>;
}

export function MenuBar({ menus }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="menubar" ref={ref}>
      {menus.map((menu, i) => (
        <div key={menu.label} className="menu-container">
          <button
            className={`menu-item ${open === i ? 'open' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && setOpen(i)}
          >
            {menu.label}
          </button>
          {open === i && (
            <div className="menu-dropdown">
              {menu.items.map((item, j) =>
                item.separator ? (
                  <div key={j} className="menu-sep" />
                ) : (
                  <button
                    key={j}
                    className={`menu-entry ${item.disabled ? 'disabled' : ''}`}
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(null);
                      item.action?.();
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
