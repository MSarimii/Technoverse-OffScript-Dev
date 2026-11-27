import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const Tabs = ({ items, activeKey, onChange }) => (
  <div role="tablist" className="flex flex-wrap gap-2 border-b border-line">
    {items.map((item) => {
      const active = item.key === activeKey;
      return (
        <button
          key={item.key}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(item.key)}
          className={`min-h-[44px] px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active ? 'border-cobalt text-cobalt' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

export const Dialog = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-surface border border-line rounded-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          {title && <h2 className="font-serif text-2xl text-ink">{title}</h2>}
          <button onClick={onClose} aria-label="Close dialog" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-subtle">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const Drawer = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <aside aria-label={title} className="fixed inset-x-3 bottom-3 z-40 lg:static lg:inset-auto lg:w-72 shrink-0 bg-surface border border-line rounded-xl p-4 flex flex-col shadow-lg lg:shadow-none">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted">{title}</h2>
        <button onClick={onClose} className="text-xs text-ink-muted hover:text-ink">Close</button>
      </div>
      {children}
    </aside>
  );
};

export const Popover = ({ open, children, className = '' }) => {
  if (!open) return null;
  return (
    <div className={`bg-surface border border-line rounded-xl shadow-lg p-4 ${className}`}>
      {children}
    </div>
  );
};

export const Tooltip = ({ label, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-ink text-surface text-[11px] font-mono whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </span>
  );
};

export const Table = ({ columns, rows, emptyText = 'No records found.' }) => (
  <div className="overflow-x-auto bg-surface border border-line rounded-xl">
    <table className="w-full text-left text-sm">
      <thead className="bg-subtle text-xs font-mono text-ink-muted uppercase">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-3">{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-muted text-xs font-mono">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={row.id || idx} className="hover:bg-canvas/60">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
