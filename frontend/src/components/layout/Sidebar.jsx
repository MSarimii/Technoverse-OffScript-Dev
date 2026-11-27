import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { examService } from '../../services/examService';
import { getInitials } from '../../lib/initials';
import { motion, AnimatePresence, useMotionValue, animate, useReducedMotion } from 'framer-motion';
import {
  Users,
  ClipboardCheck,
  BookOpen,
  Award,
  ShieldAlert,
  PanelLeftClose,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronUp,
  GripVertical,
} from 'lucide-react';

const EXPANDED_W = 240;
const COLLAPSED_W = 72;
const MIDPOINT_W = (EXPANDED_W + COLLAPSED_W) / 2;

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [collapsed, setCollapsed] = useState(false);
  const [hoveredTo, setHoveredTo] = useState(null);
  const [footerOpen, setFooterOpen] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState(0);
  const footerRef = useRef(null);

  useEffect(() => {
    if (user?.role !== 'examiner') return;
    examService
      .getAllDisputes()
      .then((res) => {
        const count = (res.data?.disputes || []).filter(
          (d) => d.status !== 'resolved' && d.status !== 'rejected'
        ).length;
        setPendingChallenges(count);
      })
      .catch(() => {});
  }, [user?.role, location.pathname]);
  const draggingRef = useRef(false);
  const widthMV = useMotionValue(EXPANDED_W);

  useEffect(() => {
    const target = collapsed ? COLLAPSED_W : EXPANDED_W;
    if (reduced) {
      widthMV.set(target);
      return;
    }
    const ctrl = animate(widthMV, target, {
      type: 'spring',
      stiffness: 380,
      damping: 32,
    });
    return () => ctrl.stop();
  }, [collapsed, reduced, widthMV]);

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

  const handleEdgePointerDown = (e) => {
    if (reduced) {
      setCollapsed((v) => !v);
      return;
    }
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startW = widthMV.get();

    const onMove = (ev) => {
      if (!draggingRef.current) return;
      const next = Math.max(COLLAPSED_W, Math.min(EXPANDED_W, startW + (ev.clientX - startX)));
      widthMV.set(next);
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const current = widthMV.get();
      const nextCollapsed = current < MIDPOINT_W;
      setCollapsed(nextCollapsed);
      animate(widthMV, nextCollapsed ? COLLAPSED_W : EXPANDED_W, {
        type: 'spring',
        stiffness: 380,
        damping: 32,
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const links =
    user?.role === 'admin'
      ? [{ to: '/admin/users', label: 'Users & Roles', icon: Users }]
      : user?.role === 'examiner'
      ? [
          { to: '/examiner', label: 'Examinations', icon: ClipboardCheck },
          { to: '/examiner/questions', label: 'Question Bank', icon: BookOpen },
          {
            to: '/examiner/challenges',
            label: 'Challenges & Integrity',
            icon: ShieldAlert,
            badge: pendingChallenges,
          },
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
      style={{ width: widthMV }}
      className="relative hidden md:flex flex-col shrink-0 min-h-[calc(100vh-64px)] bg-surface text-ink border-r border-line select-none"
    >
      {/* Tactile Drag-to-Roll Gesture Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Drag to resize sidebar"
        onPointerDown={handleEdgePointerDown}
        title="Drag to roll sidebar open or closed"
        className="group absolute top-0 -right-1.5 bottom-0 w-3 cursor-ew-resize z-30 flex items-center justify-center"
      >
        <span className="w-1 h-10 rounded-full bg-transparent group-hover:bg-[#059669]/50 transition-colors flex items-center justify-center">
          <GripVertical className="w-3 h-3 text-transparent group-hover:text-[#059669]" />
        </span>
      </div>

      <div className="sticky top-16 flex flex-col justify-between h-[calc(100vh-64px)] p-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 py-2 border-b border-line mb-2">
            {!collapsed && (
              <motion.span
                initial={reduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#059669] font-semibold whitespace-nowrap"
              >
                {user.role} Portal
              </motion.span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-subtle transition-colors ml-auto"
            >
              <motion.span
                className="inline-flex"
                animate={reduced ? undefined : { rotate: collapsed ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              >
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
              </motion.span>
            </button>
          </div>

          <nav className="space-y-1" style={{ perspective: 500 }}>
            {links.map(({ to, label, icon: Icon, badge }, idx) => {
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
                      whileHover={reduced ? undefined : { y: -1.5 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-[#059669]' : 'text-ink-muted group-hover:text-ink'
                        }`}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </motion.span>
                    {!collapsed && (
                      <motion.span
                        key={`${to}-label-${collapsed}`}
                        initial={reduced ? false : { opacity: 0, y: 6, rotateX: -25 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 28,
                          delay: reduced ? 0 : idx * 0.035,
                        }}
                        className="relative z-10 flex items-center justify-between gap-2 flex-1 min-w-0"
                      >
                        <span className="truncate">{label}</span>
                        {typeof badge === 'number' && badge > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#0B0F0E] text-white shrink-0">
                            {badge}
                          </span>
                        )}
                      </motion.span>
                    )}
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
              {getInitials(user.name)}
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
