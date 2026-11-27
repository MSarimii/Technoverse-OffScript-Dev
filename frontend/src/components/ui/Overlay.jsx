import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-[#0B0F0E]/30 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="bg-surface border border-line rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              {title && <h2 className="font-display font-semibold text-xl tracking-[-0.02em] text-ink">{title}</h2>}
              <button onClick={onClose} aria-label="Close dialog" className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-subtle transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const reduced = useReducedMotion();
  const timerRef = useRef(null);

  const open = () => {
    timerRef.current = setTimeout(() => setShow(true), 120);
  };
  const close = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  return (
    <span className="relative inline-flex" onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.span
            role="tooltip"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={{ type: 'spring', stiffness: 460, damping: 28 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F0E] text-white border border-[#181F1D] shadow-md text-[11px] font-mono whitespace-nowrap z-50"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
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
