import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Users,
  ClipboardCheck,
  BookOpen,
  Award,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronUp,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [collapsed, setCollapsed] = useState(false);
  const [hoveredTo, setHoveredTo] = useState(null);
  const [footerOpen, setFooterOpen] = useState(false);
  const footerRef = useRef(null);

  useEffect(() => {
    if (!footerOpen) return;
    const onKey = (e) => e.key === 'Escape' && setFooterOpen(false);
    const onClick = (e) => {
      if (footerRef.current && !footerRef.current.contains(e.target)) {
        setFooterOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [footerOpen]);

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

  if (links.length === 0) return null;

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <motion.aside
      aria-label="Workspace navigation"
      animate={reduced ? undefined : { width: collapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      style={{ width: collapsed ? 72 : 240 }}
      className="hidden md:flex flex-col shrink-0 min-h-[calc(100vh-64px)] bg-surface text-ink border-r border-line"
    >
      <div className="sticky top-16 flex flex-col justify-between h-[calc(100vh-64px)] p-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 py-2 border-b border-line mb-2">
            {!collapsed && (
              <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#059669] font-semibold">
                {user.role} Portal
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors ml-auto"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>

          <nav className="space-y-1">
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
                    className={`group relative flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-sm rounded-xl transition-colors ${
                      active ? 'text-[#065F46] font-semibold' : 'text-ink-muted hover:text-ink hover:bg-subtle/60'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {active && (
                      <motion.span
                        layoutId={reduced ? undefined : 'sidebar-active-pill'}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl -z-0"
                      />
                    )}
                    <motion.span
                      className="relative z-10 inline-flex"
                      whileHover={reduced ? undefined : { x: 2 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#059669]' : 'text-ink-muted group-hover:text-ink'
                        }`}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </motion.span>
                    {!collapsed && <span className="relative z-10 truncate">{label}</span>}
                  </Link>

                  <AnimatePresence>
                    {collapsed && hoveredTo === to && (
                      <motion.div
                        role="tooltip"
                        initial={reduced ? { opacity: 1 } : { opacity: 0, x: -6, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={reduced ? { opacity: 0 } : { opacity: 0, x: -6, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 rounded-lg bg-[#0B0F0E] border border-[#181F1D] shadow-lg text-xs font-medium text-white whitespace-nowrap z-50"
                      >
                        {label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Profile Popover */}
        <div ref={footerRef} className="relative pt-3 border-t border-line">
          <button
            type="button"
            onClick={() => setFooterOpen((v) => !v)}
            aria-expanded={footerOpen}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-subtle transition-colors text-left ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="w-8 h-8 rounded-full bg-[#0B0F0E] text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0">
              {user.name?.[0] || 'U'}
            </span>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink truncate">{user.name}</div>
                  <div className="text-[10px] font-mono text-ink-muted capitalize">{user.role}</div>
                </div>
                <ChevronUp className="w-3.5 h-3.5 text-ink-muted" />
              </>
            )}
          </button>

          <AnimatePresence>
            {footerOpen && (
              <motion.div
                initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 6 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                style={{ transformOrigin: 'bottom left' }}
                className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl bg-surface border border-line shadow-xl p-2 z-50 text-ink"
              >
                <div className="px-2.5 py-2 border-b border-line mb-1">
                  <div className="text-xs font-semibold truncate">{user.name}</div>
                  <div className="text-[11px] font-mono text-ink-muted truncate">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={cycleTheme}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-subtle text-left"
                >
                  <ThemeIcon className="w-3.5 h-3.5 text-[#059669]" />
                  Theme: <span className="capitalize font-mono">{theme}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFooterOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-[#FEF2F2] text-[#DC2626] text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};
