import { Toaster as SonnerToaster } from 'sonner';
import { AlertCircle, CheckCircle2, Clock, WifiOff, RefreshCw, Inbox } from 'lucide-react';

const BADGE_STYLES = {
  neutral: 'bg-subtle text-ink border-line',
  cobalt: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  success: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
};

export const Badge = ({ tone = 'neutral', className = '', children }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono border ${BADGE_STYLES[tone]} ${className}`}>
    {children}
  </span>
);

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
