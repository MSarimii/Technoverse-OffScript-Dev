import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { getRoleHome } from '../../context/AuthContext';
import { LogOut, Menu, X, Sun, Moon, Monitor, WifiOff, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { USE_MOCK } from '../../services/api';
import { IconButton, Badge } from '../ui';

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
          <Link to="/" className="flex items-baseline gap-2.5 group rounded-lg relative pb-0.5">
            <span className="font-serif text-2xl tracking-[-0.01em] text-ink leading-none">
              SEMS
            </span>
            <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.12em] text-ink-muted">
              Secure Examination Suite
            </span>
            <span aria-hidden="true" className="absolute bottom-0 left-0 w-7 h-[2px] bg-champagne rounded-full" />
          </Link>
          {import.meta.env.DEV && USE_MOCK && (
            <span
              title="Dev Mock Mode Active"
              className="w-2 h-2 rounded-full bg-champagne inline-block"
              aria-label="Dev mock mode active"
            />
          )}
          {!online && (
            <Badge tone="danger" className="hidden sm:inline-flex">
              <WifiOff className="w-3 h-3" strokeWidth={1.5} /> Offline
            </Badge>
          )}
        </div>

        {/* Minimal Desktop Top Bar */}
        <nav aria-label="Top utilities" className="hidden md:flex items-center gap-4">
          <Link
            to="/verify/VER-2026-SEMS-8841"
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Verify a report
          </Link>

          <IconButton label={`Theme: ${theme} (click to switch)`} onClick={cycleTheme} variant="ghost">
            <ThemeIcon className="w-4 h-4" strokeWidth={1.5} />
          </IconButton>

          {isAuthenticated ? (
            <div ref={profileRef} className="relative pl-2 border-l border-line">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 px-3 py-1.5 min-h-[40px] rounded-full bg-surface border border-line hover:border-champagne/50 transition-colors shadow-sm"
              >
                <span className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-mono flex items-center justify-center">
                  {user.name?.[0] || 'U'}
                </span>
                <span className="text-xs font-medium text-ink">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    role="menu"
                    initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    style={{ transformOrigin: 'top right' }}
                    className="absolute right-0 mt-2 w-60 rounded-[14px] luxury-card p-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-line mb-1">
                      <div className="text-xs font-semibold text-ink">{user.name}</div>
                      <div className="text-[11px] font-mono text-ink-muted truncate">{user.email}</div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-champagne mt-0.5">
                        {user.role}
                      </div>
                    </div>
                    <Link
                      role="menuitem"
                      to={getRoleHome(user.role)}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-subtle rounded-lg"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-champagne" />
                      Open Workspace
                    </Link>
                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-status-danger hover:bg-red-500/10 rounded-lg text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/login"
              className="min-h-[38px] inline-flex items-center text-sm font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] px-5 py-1.5 rounded-full transition-transform active:scale-[0.97]"
            >
              Sign in
            </Link>
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
