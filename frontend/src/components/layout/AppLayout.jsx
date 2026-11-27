import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Users, ClipboardCheck, BookOpen, Award, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
  const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredTo, setHoveredTo] = useState(null);

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
        <motion.aside
          aria-label="Workspace navigation"
          animate={reduced ? undefined : { width: collapsed ? 72 : 240 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
          className="hidden md:block shrink-0"
          style={{ width: collapsed ? 72 : 240 }}
        >
          <nav className="sticky top-24 space-y-1.5 bg-subtle/60 border border-line rounded-[14px] p-2.5">
            <div className="flex items-center justify-between px-2 py-1.5">
              {!collapsed && (
                <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-champagne">
                  {user.role}
                </span>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition-colors ml-auto"
              >
                {collapsed ? <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} /> : <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>

            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <div
                  key={to}
                  className="relative"
                  onMouseEnter={() => setHoveredTo(to)}
                  onMouseLeave={() => setHoveredTo(null)}
                >
                  <Link
                    to={to}
                    aria-label={collapsed ? label : undefined}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm rounded-[10px] transition-colors ${
                      active ? 'text-ink font-medium' : 'text-ink-muted hover:text-ink'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {active && (
                      <motion.span
                        layoutId={reduced ? undefined : 'sidebar-active-pill'}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 bg-surface border border-line rounded-[10px] shadow-sm -z-10"
                      >
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-champagne" />
                      </motion.span>
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        active ? 'text-champagne' : 'group-hover:translate-x-0.5'
                      }`}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>

                  <AnimatePresence>
                    {collapsed && hoveredTo === to && (
                      <motion.div
                        role="tooltip"
                        initial={reduced ? { opacity: 1 } : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-lg bg-surface border border-line shadow-md text-xs font-medium text-ink whitespace-nowrap z-50"
                      >
                        {label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </motion.aside>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};
