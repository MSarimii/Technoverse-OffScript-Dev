import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Users, ClipboardCheck, BookOpen, Award, ChevronRight } from 'lucide-react';

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

export const AppLayout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  const links =
    user?.role === 'admin'
      ? [{ to: '/admin/users', label: 'Users & Roles', icon: Users }]
      : user?.role === 'examiner'
      ? [
          { to: '/examiner', label: 'Examinations', icon: ClipboardCheck },
          { to: '/examiner/questions', label: 'Question Bank', icon: BookOpen },
        ]
      : user?.role === 'candidate'
      ? [
          { to: '/candidate', label: 'My Exams', icon: ClipboardCheck },
          { to: '/candidate/results', label: 'Results', icon: Award },
        ]
      : [];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
      {links.length > 0 && (
        <aside aria-label="Workspace navigation" className="hidden md:block w-52 shrink-0">
          <nav className="sticky top-24 space-y-1 border-r border-line pr-4">
            <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-champagne">
              {user.role}
            </div>
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2.5 px-3 py-2 min-h-[44px] text-sm border-l-2 transition-colors ${
                    active
                      ? 'border-champagne text-ink font-medium'
                      : 'border-transparent text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4 text-champagne" strokeWidth={1.5} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};
