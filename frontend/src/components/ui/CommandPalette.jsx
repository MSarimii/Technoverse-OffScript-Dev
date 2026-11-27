import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import {
  Search,
  ClipboardCheck,
  BookOpen,
  ShieldAlert,
  Users,
  Award,
  Plus,
  Sun,
  LogOut,
  CornerDownLeft,
} from 'lucide-react';

export const CommandPalette = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const isExamPlayer =
    location.pathname.startsWith('/candidate/attempts/') ||
    location.pathname.startsWith('/candidate/exam/');

  const commands = useMemo(() => {
    if (!isAuthenticated || !user) return [];
    const roleItems =
      user.role === 'admin'
        ? [{ id: 'admin-users', label: 'Users & Roles', group: 'Navigation', icon: Users, run: () => navigate('/admin/users') }]
        : user.role === 'examiner'
        ? [
            { id: 'examiner-home', label: 'Examiner Console', group: 'Navigation', icon: ClipboardCheck, run: () => navigate('/examiner') },
            { id: 'examiner-questions', label: 'Question Bank', group: 'Navigation', icon: BookOpen, run: () => navigate('/examiner/questions') },
            { id: 'examiner-challenges', label: 'Challenges & Integrity', group: 'Navigation', icon: ShieldAlert, run: () => navigate('/examiner/challenges') },
            { id: 'examiner-new', label: 'Create New Examination', group: 'Actions', icon: Plus, run: () => navigate('/examiner/exams/new') },
          ]
        : [
            { id: 'cand-exams', label: 'My Examinations', group: 'Navigation', icon: ClipboardCheck, run: () => navigate('/candidate/exams') },
            { id: 'cand-results', label: 'Academic Transcripts', group: 'Navigation', icon: Award, run: () => navigate('/candidate/results') },
          ];

    return [
      ...roleItems,
      {
        id: 'toggle-theme',
        label: `Cycle Theme (current: ${theme})`,
        group: 'Preferences',
        icon: Sun,
        run: () => cycleTheme(),
      },
      {
        id: 'sign-out',
        label: 'Sign Out',
        group: 'Account',
        icon: LogOut,
        run: () => {
          logout();
          navigate('/login');
        },
      },
    ];
  }, [isAuthenticated, user, theme, cycleTheme, logout, navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  useEffect(() => {
    if (!isAuthenticated || isExamPlayer) return;
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpenEvt = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('sems-open-command-palette', onOpenEvt);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('sems-open-command-palette', onOpenEvt);
    };
  }, [isAuthenticated, isExamPlayer]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  if (!isAuthenticated || isExamPlayer) return null;

  const execute = (item) => {
    setOpen(false);
    item?.run();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter' && filtered[activeIdx]) {
      e.preventDefault();
      execute(filtered[activeIdx]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-[#0B0F0E]/35 backdrop-blur-sm flex items-start justify-center pt-[14vh] px-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type a command or destination..."
                aria-label="Command search"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <kbd className="px-2 py-0.5 rounded bg-subtle border border-line text-[10px] font-mono text-ink-muted">
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-ink-muted">
                  No matching commands.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => execute(item)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${
                        active
                          ? 'bg-[#0B0F0E] text-white'
                          : 'text-ink hover:bg-subtle'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#10B981]' : 'text-ink-muted'
                          }`}
                        />
                        <span className="truncate font-medium">{item.label}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-mono uppercase ${
                            active ? 'text-white/60' : 'text-ink-muted'
                          }`}
                        >
                          {item.group}
                        </span>
                        {active && <CornerDownLeft className="w-3.5 h-3.5 text-[#10B981]" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
