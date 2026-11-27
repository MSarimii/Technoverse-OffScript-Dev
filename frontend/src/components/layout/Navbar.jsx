import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, LogOut, BookOpen, Users, ClipboardCheck, Award, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { USE_MOCK } from '../../services/api';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide global navbar inside the distraction-free Exam Workspace
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

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-800 rounded-md">
            <div className="w-9 h-9 rounded-lg bg-navy-900 text-white flex items-center justify-center transition-transform duration-150 group-active:scale-[0.97]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-xl tracking-tight text-ink font-normal block leading-none">
                SEMS
              </span>
              <span className="text-[11px] font-mono text-ink-muted tracking-tight">
                Secure Examination Suite
              </span>
            </div>
          </Link>
          {USE_MOCK && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-amber-100 text-amber-900 border border-amber-300">
              MOCK MODE
            </span>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5">
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
                className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                  active ? 'bg-navy-50 text-navy-900' : 'text-ink-muted hover:text-ink hover:bg-subtle'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-4 border-l border-line">
              <div className="text-right">
                <div className="text-xs font-semibold text-ink leading-tight">{user.name}</div>
                <div className="text-[11px] font-mono text-ink-muted capitalize">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-medium text-status-danger hover:bg-red-50 px-2.5 py-1.5 rounded-md border border-transparent hover:border-red-200 transition-colors active:scale-[0.98]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-semibold bg-navy-900 hover:bg-navy-800 text-white px-4 py-2 rounded-md transition-transform active:scale-[0.98]"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-md text-ink hover:bg-subtle"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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
              className="block py-2 text-sm font-semibold text-navy-900"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
