import { forwardRef, useId } from 'react';

const baseField =
  'w-full px-3 py-2.5 min-h-[44px] text-sm bg-canvas border border-line rounded-lg text-ink placeholder:text-ink-muted disabled:opacity-50 transition-colors';

export const Input = forwardRef(({ label, error, className = '', id, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-semibold text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${baseField} ${error ? 'border-status-danger' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef(({ label, error, className = '', id, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-semibold text-ink">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${baseField} min-h-[96px] ${error ? 'border-status-danger' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ label, error, children, className = '', id, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="block text-xs font-semibold text-ink">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${baseField} ${error ? 'border-status-danger' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

export const Checkbox = forwardRef(({ label, className = '', id, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label htmlFor={fieldId} className={`inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer text-sm text-ink ${className}`}>
      <input ref={ref} id={fieldId} type="checkbox" className="w-4 h-4 accent-[#2F5BFF] rounded" {...props} />
      {label && <span>{label}</span>}
    </label>
  );
});
Checkbox.displayName = 'Checkbox';

export const Radio = forwardRef(({ label, className = '', id, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <label htmlFor={fieldId} className={`inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer text-sm text-ink ${className}`}>
      <input ref={ref} id={fieldId} type="radio" className="w-4 h-4 accent-[#2F5BFF]" {...props} />
      {label && <span>{label}</span>}
    </label>
  );
});
Radio.displayName = 'Radio';

export const Switch = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className="inline-flex items-center gap-2.5 min-h-[44px] text-sm text-ink disabled:opacity-50"
  >
    <span
      className={`w-10 h-6 rounded-full p-0.5 transition-colors flex items-center ${
        checked ? 'bg-cobalt justify-end' : 'bg-subtle border border-line justify-start'
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
    </span>
    {label && <span>{label}</span>}
  </button>
);
