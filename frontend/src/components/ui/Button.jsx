import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] border-transparent shadow-sm hover:shadow-md',
  champagne: 'bg-champagne hover:bg-champagne-lit text-white border-transparent shadow-sm hover:shadow-md',
  secondary: 'bg-surface hover:bg-subtle text-ink border-line shadow-sm',
  ghost: 'bg-transparent hover:bg-subtle text-ink border-transparent',
  danger: 'bg-status-danger hover:opacity-90 text-white border-transparent shadow-sm',
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
        whileTap={reduced || disabled || loading ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-[10px] border transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
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
        whileTap={reduced || disabled || loading ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] border transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : children}
      </motion.button>
    );
  }
);
IconButton.displayName = 'IconButton';
