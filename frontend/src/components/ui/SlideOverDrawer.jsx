import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export const SlideOverDrawer = ({
  open,
  onClose,
  title,
  eyebrow,
  ariaLabel,
  footer,
  children,
}) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          key="slideover-root"
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          className="fixed inset-0 z-[100]"
        >
          <motion.div
            key="slideover-backdrop"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduced ? 0.01 : 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px]"
          />

          <motion.aside
            key="slideover-panel"
            initial={reduced ? { opacity: 1 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '100%' }}
            transition={
              reduced
                ? { duration: 0.01 }
                : { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }
            }
            onClick={(e) => e.stopPropagation()}
            className="fixed top-0 right-0 bottom-0 h-dvh w-full max-w-md z-[101] bg-[var(--surface)] border-l border-[var(--line)] text-[var(--ink)] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--line)] shrink-0">
              <div>
                {eyebrow && (
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">
                    {eyebrow}
                  </p>
                )}
                {title && (
                  <h2 className="font-display font-bold text-lg text-[var(--ink)] tracking-[-0.02em]">
                    {title}
                  </h2>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col justify-between gap-6">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)]">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export const DrawerSection = ({ index = 0, className = '', children }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.01 : 0.18, delay: reduced ? 0 : index * 0.04 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
