import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Sidebar } from './Sidebar';

export const Breadcrumbs = ({ items }) => {
  if (!items?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-muted mb-3">
      {items.map((item, idx) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {idx > 0 && <ChevronRight className="w-3 h-3 text-champagne" aria-hidden="true" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-ink transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
};

export const PageHeader = ({ title, subtitle, actions, breadcrumbs }) => (
  <div className="mb-8 pb-5 border-b border-line">
    {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl sm:text-5xl text-ink tracking-[-0.01em] leading-[1.05]">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1.5 max-w-[62ch]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  </div>
);

export const AppLayout = ({ children }) => (
  <div className="w-full flex min-h-[calc(100vh-64px)]">
    <Sidebar />
    <div className="flex-1 min-w-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
      {children}
    </div>
  </div>
);
