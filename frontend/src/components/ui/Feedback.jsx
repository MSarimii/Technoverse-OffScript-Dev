import { useState } from 'react';
import { Toaster as SonnerToaster, toast } from 'sonner';
import { AlertCircle, CheckCircle2, Clock, WifiOff, RefreshCw, Inbox, Copy, Check } from 'lucide-react';

const BADGE_STYLES = {
  neutral: 'bg-[#F4F4F5] text-[#18181B] border-[#E4E4E7]',
  cobalt: 'bg-white text-[#18181B] border-[#E4E4E7]',
  success: 'bg-white text-[#18181B] border-[#E4E4E7]',
  warning: 'bg-white text-[#18181B] border-[#E4E4E7]',
  danger: 'bg-white text-[#18181B] border-[#E4E4E7]',
};

const DOT_COLORS = {
  cobalt: 'bg-[#10B981]',
  success: 'bg-[#10B981]',
  warning: 'bg-[#F59E0B]',
  danger: 'bg-[#EF4444]',
  slate: 'bg-[#64748B]',
};

export const Badge = ({ tone = 'neutral', dot, className = '', children }) => {
  const dotColor = dot ? DOT_COLORS[dot] : tone !== 'neutral' ? DOT_COLORS[tone] : null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${BADGE_STYLES[tone] || BADGE_STYLES.neutral} ${className}`}>
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />}
      {children}
    </span>
  );
};

export const StatusChip = ({ status, label }) => {
  const map = {
    saved: { tone: 'success', icon: CheckCircle2, text: label || 'Saved' },
    saving: { tone: 'neutral', icon: Clock, text: label || 'Saving...' },
    offline: { tone: 'warning', icon: WifiOff, text: label || 'Offline' },
    retrying: { tone: 'warning', icon: RefreshCw, text: label || 'Retrying...' },
    error: { tone: 'danger', icon: AlertCircle, text: label || 'Sync failed' },
  };
  const cfg = map[status] || map.saved;
  const Icon = cfg.icon;
  return (
    <Badge tone={cfg.tone}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{cfg.text}</span>
    </Badge>
  );
};

export const ProgressRing = ({ progress = 1, size = 24, strokeWidth = 2.5, className = '' }) => {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={className}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-line)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

export const Skeleton = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse rounded bg-subtle ${className}`} aria-hidden="true" />
);

export const CopyButton = ({ value, toastMessage, children, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value)?.catch(() => {});
    setCopied(true);
    toast.success(toastMessage || `Copied ${value}`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `Copied ${value}` : `Copy ${value}`}
      className={`inline-flex items-center gap-1.5 transition-colors ${className}`}
    >
      {children}
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#059669] shrink-0" strokeWidth={2.25} />
      ) : (
        <Copy className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={1.75} />
      )}
    </button>
  );
};

export const EmptyState = ({ title, description, action }) => (
  <div className="bg-surface border border-line rounded-xl p-10 text-center space-y-2">
    <div className="w-10 h-10 rounded-lg bg-subtle text-ink-muted flex items-center justify-center mx-auto mb-2">
      <Inbox className="w-5 h-5" aria-hidden="true" />
    </div>
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    {description && <p className="text-sm text-ink-muted max-w-md mx-auto">{description}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const ErrorState = ({ message = 'Unable to load data.', onRetry }) => (
  <div role="alert" className="bg-red-50/70 border border-red-200 rounded-xl p-6 text-center space-y-3">
    <AlertCircle className="w-6 h-6 text-status-danger mx-auto" aria-hidden="true" />
    <p className="text-sm text-status-danger font-medium">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="text-xs font-mono font-semibold text-cobalt hover:underline">
        Retry request
      </button>
    )}
  </div>
);

export const Toaster = (props) => <SonnerToaster richColors position="top-right" {...props} />;
