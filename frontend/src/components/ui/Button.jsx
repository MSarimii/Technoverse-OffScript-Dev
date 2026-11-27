import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-[var(--accent)] hover:opacity-90 text-[var(--accent-ink)] border-transparent',
  champagne: 'bg-champagne hover:bg-champagne-lit text-[#070A14] border-transparent',
  secondary: 'bg-transparent hover:bg-subtle text-ink border-line',
  ghost: 'bg-transparent hover:bg-subtle text-ink border-transparent',
  danger: 'bg-status-danger hover:opacity-90 text-white border-transparent',
};

const SIZES = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs',
  md: 'min-h-[44px] px-4 py-2 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-sm',
};

export const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-[10px] border transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export const IconButton = forwardRef(
  ({ label, variant = 'secondary', loading = false, disabled, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] border transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : children}
    </button>
  )
);
IconButton.displayName = 'IconButton';
