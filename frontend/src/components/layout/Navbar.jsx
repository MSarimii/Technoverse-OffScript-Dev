import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { getRoleHome } from '../../context/AuthContext';
import { LogOut, Menu, X, Sun, Moon, Monitor, WifiOff, LayoutDashboard, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { USE_MOCK } from '../../services/api';
import { IconButton, Badge, Tooltip } from '../ui';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const profileRef = useRef(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e) => e.key === 'Escape' && setProfileOpen(false);
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [profileOpen]);

  if (location.pathname.startsWith('/candidate/exam/')) {
    return null;
  }

  const isPublicRoute =
    location.pathname === '/' ||
    location.pathname.startsWith('/verify') ||
    location.pathname === '/login' ||
    location.pathname === '/register';

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    logout();
    navigate('/login');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const mobileLinks = isAuthenticated
    ? user.role === 'admin'
      ? [{ to: '/admin/users', label: 'Users & Roles' }]
      : user.role === 'examiner'
      ? [
          { to: '/examiner', label: 'Examinations' },
          { to: '/examiner/questions', label: 'Question Bank' },
        ]
      : [
          { to: '/candidate', label: 'My Exams' },
          { to: '/candidate/results', label: 'Results' },
        ]
    : [];

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group rounded-lg">
            <span className="font-display font-extrabold text-xl tracking-[-0.04em] text-ink leading-none">
              SEMS
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] text-ink-muted">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
              </span>
              Secure Examination Suite
            </span>
          </Link>
          {!online && (
            <Badge tone="danger" className="hidden sm:inline-flex">
              <WifiOff className="w-3 h-3" strokeWidth={1.5} /> Offline
            </Badge>
          )}
        </div>

        {/* Minimal Desktop Top Bar */}
        <nav aria-label="Top utilities" className="hidden md:flex items-center gap-2.5">
          {isAuthenticated && (user?.role === 'admin' || user?.role === 'examiner') && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('sems-open-command-palette'))}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface hover:bg-subtle text-xs font-mono text-ink-muted hover:text-ink transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick jump</span>
              <kbd className="px-1.5 py-0.5 rounded bg-subtle border border-line text-[10px]">⌘K</kbd>
            </button>
          )}
          <Link
            to="/verify/VER-2026-SEMS-8841"
            className="px-3.5 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:text-ink hover:bg-subtle transition-colors"
          >
            Verify a report
          </Link>

          <Tooltip label={`Theme: ${theme}`} placement="bottom" align="right">
            <IconButton label={`Theme: ${theme} (click to switch)`} onClick={cycleTheme} variant="ghost">
              <ThemeIcon className="w-4 h-4" strokeWidth={1.5} />
            </IconButton>
          </Tooltip>

          {isPublicRoute && (
            isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-line">
                <Link
                  to={getRoleHome(user.role)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 text-sm font-medium bg-[#0B0F0E] hover:bg-[#181F1D] text-white px-4 py-1.5 rounded-full transition-all active:scale-[0.98]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#10B981]" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[38px] inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border border-line bg-surface hover:bg-[#FEF2F2] hover:text-[#DC2626] hover:border-[#FECACA] text-ink-muted transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="min-h-[38px] inline-flex items-center text-sm font-medium bg-[#0B0F0E] hover:bg-[#181F1D] text-white px-5 py-1.5 rounded-full transition-transform active:scale-[0.98]"
              >
                Sign in
              </Link>
            )
          )}
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <IconButton label={`Theme: ${theme}`} onClick={cycleTheme} variant="ghost">
            <ThemeIcon className="w-4 h-4" strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Toggle navigation" onClick={() => setMobileOpen((v) => !v)} variant="ghost">
            {mobileOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
          </IconButton>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-surface px-4 py-3 space-y-2">
          <Link
            to="/verify/VER-2026-SEMS-8841"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-ink-muted"
          >
            Verify a report
          </Link>
          {mobileLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-ink"
            >
              {label}
            </Link>
          ))}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full text-left py-2 text-sm text-status-danger"
            >
              Sign out ({user.name})
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-champagne"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
