import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Menu, X, Sun, Moon, Monitor, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { USE_MOCK } from '../../services/api';
import { IconButton, Badge } from '../ui';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

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

  if (location.pathname.startsWith('/candidate/exam/')) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/login');
  };

  const navLinks = [];
  if (isAuthenticated) {
    if (user.role === 'admin') {
      navLinks.push({ to: '/admin/users', label: 'Users' });
    } else if (user.role === 'examiner') {
      navLinks.push({ to: '/examiner', label: 'Examinations' });
      navLinks.push({ to: '/examiner/questions', label: 'Question Bank' });
    } else if (user.role === 'candidate') {
      navLinks.push({ to: '/candidate', label: 'My Exams' });
      navLinks.push({ to: '/candidate/results', label: 'Results' });
    }
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-baseline gap-2.5 group rounded-lg">
            <span className="font-serif text-2xl tracking-[-0.01em] text-ink leading-none">
              SEMS
            </span>
            <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-[0.12em] text-ink-muted">
              Secure Examination Suite
            </span>
          </Link>
          {import.meta.env.DEV && USE_MOCK && (
            <Badge tone="warning" className="hidden sm:inline-flex">DEV MOCK</Badge>
          )}
          {!online && (
            <Badge tone="danger" className="hidden sm:inline-flex">
              <WifiOff className="w-3 h-3" strokeWidth={1.5} /> Offline
            </Badge>
          )}
        </div>

        {/* Desktop Nav */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          <Link
            to="/verify/VER-2026-SEMS-8841"
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Verify a report
          </Link>

          {navLinks.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`text-sm py-1 border-b transition-colors ${
                  active ? 'text-ink border-champagne font-medium' : 'text-ink-muted border-transparent hover:text-ink'
                }`}
              >
                {label}
              </Link>
            );
          })}

          <IconButton label={`Theme: ${theme} (click to switch)`} onClick={cycleTheme} variant="ghost">
            <ThemeIcon className="w-4 h-4" strokeWidth={1.5} />
          </IconButton>

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-4 border-l border-line">
              <div className="text-right">
                <div className="text-xs font-medium text-ink leading-tight">{user.name}</div>
                <div className="text-[11px] font-mono text-champagne capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="min-h-[36px] flex items-center gap-1.5 text-xs text-ink-muted hover:text-status-danger px-2.5 py-1.5 rounded-lg transition-colors active:scale-[0.97]"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="min-h-[38px] inline-flex items-center text-sm font-medium bg-[var(--accent)] text-[var(--accent-ink)] px-5 py-1.5 rounded-full transition-transform active:scale-[0.97]"
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
          {navLinks.map(({ to, label }) => (
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
