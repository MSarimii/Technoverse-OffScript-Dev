import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export const SlideOverDrawer = ({
  open,
  onClose,
  title,
  eyebrow,
  ariaLabel,
  children,
}) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="slideover-backdrop"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.18 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          className="fixed inset-0 z-50 flex justify-end bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
        >
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
            className="w-full max-w-md h-full bg-[var(--surface)] border-l border-[var(--line)] text-[var(--ink)] shadow-2xl p-6 overflow-y-auto flex flex-col justify-between gap-6"
          >
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] shrink-0">
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
              <div className="flex-1 flex flex-col justify-between gap-6">{children}</div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
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
