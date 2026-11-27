import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, LogOut, BookOpen, Users, ClipboardCheck, Award, Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { useState } from 'react';
import { USE_MOCK } from '../../services/api';
import { IconButton, Badge } from '../ui';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      navLinks.push({ to: '/admin/users', label: 'Users & Roles', icon: Users });
    } else if (user.role === 'examiner') {
      navLinks.push({ to: '/examiner', label: 'Examinations', icon: ClipboardCheck });
      navLinks.push({ to: '/examiner/questions', label: 'Question Bank', icon: BookOpen });
    } else if (user.role === 'candidate') {
      navLinks.push({ to: '/candidate', label: 'My Exams', icon: ClipboardCheck });
      navLinks.push({ to: '/candidate/results', label: 'Results', icon: Award });
    }
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-cobalt text-white flex items-center justify-center transition-transform duration-150 group-active:scale-[0.97]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-xl tracking-tight text-ink block leading-none">
                SEMS
              </span>
              <span className="text-[11px] font-mono text-ink-muted tracking-tight">
                Secure Examination Suite
              </span>
            </div>
          </Link>
          {USE_MOCK && <Badge tone="warning" className="hidden sm:inline-flex">MOCK MODE</Badge>}
        </div>

        {/* Desktop Nav */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-4">
          <Link
            to="/verify/VER-2026-SEMS-8841"
            className="text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Verify Report
          </Link>

          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                  active ? 'bg-navy-50 text-cobalt' : 'text-ink-muted hover:text-ink hover:bg-subtle'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}

          <IconButton label={`Theme: ${theme} (click to switch)`} onClick={cycleTheme} variant="ghost">
            <ThemeIcon className="w-4 h-4" />
          </IconButton>

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-3 border-l border-line">
              <div className="text-right">
                <div className="text-xs font-semibold text-ink leading-tight">{user.name}</div>
                <div className="text-[11px] font-mono text-ink-muted capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="min-h-[36px] flex items-center gap-1.5 text-xs font-medium text-status-danger hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors active:scale-[0.97]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="min-h-[40px] inline-flex items-center text-sm font-semibold bg-cobalt hover:bg-navy-800 text-white px-4 py-2 rounded-lg transition-transform active:scale-[0.97]"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <IconButton label={`Theme: ${theme}`} onClick={cycleTheme} variant="ghost">
            <ThemeIcon className="w-4 h-4" />
          </IconButton>
          <IconButton label="Toggle navigation" onClick={() => setMobileOpen((v) => !v)} variant="ghost">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </IconButton>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-surface px-4 py-3 space-y-2">
          <Link
            to="/verify/VER-2026-SEMS-8841"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-ink-muted"
          >
            Verify Report
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
              className="w-full text-left py-2 text-sm font-medium text-status-danger"
            >
              Sign out ({user.name})
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-cobalt"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
