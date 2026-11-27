import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'relative overflow-hidden group bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_6px_rgba(11,15,14,0.12)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_18px_rgba(11,15,14,0.18)]',
  emerald:
    'relative overflow-hidden group bg-[#059669] hover:bg-[#047857] text-white border-transparent shadow-sm hover:shadow-[0_6px_18px_rgba(5,150,105,0.25)]',
  champagne:
    'relative overflow-hidden group bg-[#059669] hover:bg-[#047857] text-white border-transparent shadow-sm hover:shadow-[0_6px_18px_rgba(5,150,105,0.25)]',
  secondary:
    'bg-surface hover:bg-subtle text-ink border-line hover:border-line-strong shadow-sm',
  ghost: 'bg-transparent hover:bg-subtle text-ink border-transparent',
  danger: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white border-transparent shadow-sm',
};

const SIZES = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[44px] px-4 py-2 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-sm',
};

export const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => {
    const reduced = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        whileHover={reduced || disabled || loading ? undefined : { y: -1 }}
        whileTap={reduced || disabled || loading ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size]} ${className}`}
        {...props}
      >
        {(variant === 'primary' || variant === 'emerald' || variant === 'champagne') && !reduced && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

export const IconButton = forwardRef(
  ({ label, variant = 'secondary', loading = false, disabled, className = '', children, ...props }, ref) => {
    const reduced = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        aria-label={label}
        title={label}
        disabled={disabled || loading}
        whileHover={reduced || disabled || loading ? undefined : { y: -1 }}
        whileTap={reduced || disabled || loading ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant] || VARIANTS.secondary} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : children}
      </motion.button>
    );
  }
);
IconButton.displayName = 'IconButton';
