import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { attemptService } from '../../services/attemptService';
import { examService } from '../../services/examService';
import { useServerTimer } from '../../hooks/useServerTimer';
import { useOfflineAnswerQueue } from '../../hooks/useOfflineAnswerQueue';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Flag,
  Square,
  WifiOff,
  RefreshCw,
  SlidersHorizontal,
  NotebookPen,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  FlaskConical,
  Bell,
  HelpCircle,
} from 'lucide-react';

export const ExamWorkspacePage = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isSandboxRequest = new URLSearchParams(location.search).get('sandbox') === '1';
  const [attempt, setAttempt] = useState(null);
  const [serverTime, setServerTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reachability via heartbeat (2 consecutive failures = unstable/offline)
  const [isReachable, setIsReachable] = useState(true);
  const failedHeartbeatsRef = useRef(0);

  // Preferences (4.7)
  const DEFAULT_PREFS = {
    fontSizePx: 16,
    lineSpacing: 'normal',
    density: 'comfortable',
    palettePosition: 'right',
    theme: 'light',
    showOptionLetters: true,
  };
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQueueDetail, setShowQueueDetail] = useState(false);

  // Scratchpad (4.8) & Announcements Drawer
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpad, setScratchpad] = useState('');
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lastAnnouncementAtRef = useRef(new Date(0).toISOString());
  const scratchTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        let attemptId = location.state?.attemptId;
        if (!attemptId) {
          const startRes = isSandboxRequest
            ? await examService.startSandbox(examId)
            : await attemptService.startAttempt(examId);
          attemptId = startRes.data?.attempt?.id;
        }
        const res = await attemptService.getAttempt(attemptId);
        if (!mounted) return;
        const loaded = res.data?.attempt;
        // Defensive guard: never render answer keys/rubrics if a backend ever leaks them
        if (loaded?.snapshot?.questions) {
          loaded.snapshot.questions = loaded.snapshot.questions.map((q) => {
            if ('rubric' in q || q.options?.some((o) => 'isCorrect' in o)) {
              console.error('SECURITY_CONTRACT_VIOLATION: Backend leaked rubric or isCorrect to candidate payload.');
            }
            const { rubric: _r, ...safeQ } = q;
            return {
              ...safeQ,
              options: (q.options || []).map(({ id, text }) => ({ id, text })),
            };
          });
        }
        setAttempt(loaded);
        setServerTime(res.data?.serverTime);
        if (loaded.preferences) {
          setPrefs((prev) => ({
            ...prev,
            ...loaded.preferences,
            theme: loaded.preferences.theme === 'paper' ? 'light' : loaded.preferences.theme || 'light',
          }));
        }
        setScratchpad(loaded.scratchpad || '');
      } catch (err) {
        toast.error(err.message || 'Unable to load examination workspace');
        navigate(isSandboxRequest ? '/examiner' : '/candidate', { replace: true });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [examId, isSandboxRequest, location.state, navigate]);

  // Apply theme attribute and restore global ThemeContext on unmount
  useEffect(() => {
    const theme = prefs.theme || 'light';
    if (theme === 'light' || theme === 'paper') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    return () => {
      const savedTheme = localStorage.getItem('sems_theme') || 'system';
      if (savedTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    };
  }, [prefs.theme]);

  const {
    answers,
    markedForReview,
    queuedCount,
    queuedQuestionIds,
    isOnline,
    syncStatus,
    lateSyncedCount,
    enqueueAnswer,
    toggleMarkForReview,
    flushQueue,
    clearLocalQueue,
  } = useOfflineAnswerQueue({
    attemptId: attempt?.id,
    initialAnswers: attempt?.answers,
    initialMarked: attempt?.markedForReview,
    startedAt: attempt?.startedAt,
  });

  const handleFinalSubmit = useCallback(
    async (isAuto = false) => {
      if (!attempt?.id || submitting) return;
      setSubmitting(true);
      try {
        await flushQueue();
        await attemptService.submitAttempt(attempt.id);
        clearLocalQueue();
        toast.success(isAuto ? 'Time is up — submitting your saved answers.' : 'Examination submitted successfully.');
        navigate(attempt.isSandbox ? '/examiner' : '/candidate', { replace: true });
      } catch (err) {
        toast.error(err.message || 'Submission failed. Your answers remain queued.');
        setSubmitting(false);
      }
    },
    [attempt, clearLocalQueue, flushQueue, navigate, submitting]
  );

  const { progress, formatted, urgency, announcement, syncServerTime } = useServerTimer({
    deadlineAt: attempt?.deadlineAt,
    startedAt: attempt?.startedAt,
    serverTime,
    onExpire: () => handleFinalSubmit(true),
  });

  // Heartbeat (10s) + Announcements poll (5s)
  useEffect(() => {
    if (!attempt?.id) return;
    const hb = setInterval(async () => {
      if (!navigator.onLine) {
        failedHeartbeatsRef.current += 1;
        setIsReachable(false);
        return;
      }
      const t0 = performance.now();
      try {
        const res = await attemptService.sendHeartbeat(attempt.id);
        const rttMs = Math.round(performance.now() - t0);
        failedHeartbeatsRef.current = 0;
        setIsReachable(true);
        syncServerTime(res.data?.serverTime, rttMs);
      } catch {
        failedHeartbeatsRef.current += 1;
        if (failedHeartbeatsRef.current >= 2) {
          setIsReachable(false);
        }
      }
    }, 10000);

    const pollAnn = async () => {
      if (!navigator.onLine) return;
      try {
        const res = await attemptService.getAnnouncements(attempt.examId, lastAnnouncementAtRef.current);
        const list = res.data?.announcements || [];
        if (list.length > 0) {
          const isInitial = lastAnnouncementAtRef.current === new Date(0).toISOString();
          lastAnnouncementAtRef.current = list[0].createdAt;
          setAnnouncements((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const fresh = list.filter((x) => !existingIds.has(x.id));
            return [...fresh, ...prev];
          });
          if (!isInitial) {
            setUnreadAnnouncements((c) => c + list.length);
            list.forEach((item) => toast.info(`Examiner Announcement: ${item.message}`, { duration: 8000 }));
          }
        }
      } catch {
        // ignore poll error
      }
    };

    pollAnn();
    const ann = setInterval(pollAnn, 5000);

    return () => {
      clearInterval(hb);
      clearInterval(ann);
    };
  }, [attempt?.id, attempt?.examId, syncServerTime]);

  // Passive integrity event indicators (neutral wording)
  useEffect(() => {
    if (!attempt?.id || attempt.isSandbox) return;
    const onVisibility = () => {
      if (document.hidden) attemptService.logEvent(attempt.id, { type: 'tab_hidden' }).catch(() => {});
    };
    const onBlur = () => {
      attemptService.logEvent(attempt.id, { type: 'window_blur' }).catch(() => {});
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        attemptService.logEvent(attempt.id, { type: 'fullscreen_exit' }).catch(() => {});
      }
    };
    const onPaste = () => {
      attemptService.logEvent(attempt.id, { type: 'paste' }).catch(() => {});
    };
    const onCopy = () => {
      attemptService.logEvent(attempt.id, { type: 'copy' }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('paste', onPaste);
    document.addEventListener('copy', onCopy);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('copy', onCopy);
    };
  }, [attempt?.id, attempt?.isSandbox]);

  const questions = attempt?.snapshot?.questions || [];
  const currentQ = questions[currentIndex];

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      const isTyping = tag === 'textarea' || tag === 'input';

      if (e.key === 'Escape') {
        setShowPrefs(false);
        setShowShortcuts(false);
        setShowSubmitModal(false);
        return;
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        setShowSubmitModal(true);
        return;
      }
      if (isTyping && !e.altKey) return;

      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key.toLowerCase() === 'm' && currentQ) {
        e.preventDefault();
        toggleMarkForReview(currentQ.id);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowScratchpad((v) => !v);
      } else if (/^[1-9]$/.test(e.key) && currentQ && currentQ.options?.length) {
        const idx = Number(e.key) - 1;
        const opt = currentQ.options[idx];
        if (opt) {
          if (currentQ.type === 'mcq_single') enqueueAnswer(currentQ.id, opt.id);
          else if (currentQ.type === 'mcq_multi') {
            const prev = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
            const next = prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id];
            enqueueAnswer(currentQ.id, next);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answers, currentQ, enqueueAnswer, questions.length, toggleMarkForReview]);

  const updatePreference = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (attempt?.id) {
      attemptService.savePreferences(attempt.id, next).catch(() => {});
    }
  };

  const handleScratchpadChange = (val) => {
    setScratchpad(val);
    if (scratchTimerRef.current) clearTimeout(scratchTimerRef.current);
    scratchTimerRef.current = setTimeout(() => {
      if (attempt?.id) {
        attemptService.saveScratchpad(attempt.id, val).catch(() => {});
      }
    }, 600);
  };

  if (loading || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="font-mono text-sm text-ink-muted">Loading snapshotted examination...</p>
      </div>
    );
  }

  const fontSizeStyle = { fontSize: `${prefs.fontSizePx || 16}px` };
  const lineSpacingClass = prefs.lineSpacing === 'relaxed' ? 'leading-loose' : 'leading-relaxed';
  const paddingClass = prefs.density === 'compact' ? 'p-4 sm:p-5' : 'p-5 sm:p-8';

  const isQuestionAnswered = (q) => {
    const val = answers[q.id];
    return Array.isArray(val) ? val.length > 0 : Boolean(val);
  };

  const answeredCount = questions.filter(isQuestionAnswered).length;
  const effectiveOffline = !isOnline || !isReachable;

  // Timer SVG progress ring
  const ringR = 9;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - progress);

  const toggleMultiOption = (qid, optId) => {
    const prev = Array.isArray(answers[qid]) ? answers[qid] : [];
    const next = prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId];
    enqueueAnswer(qid, next);
  };

  const paletteAside = (
    <aside
      aria-label="Question palette"
      className={`${
        prefs.palettePosition === 'bottom' ? 'w-full' : 'w-full lg:w-72 shrink-0'
      } bg-surface border border-line rounded-xl p-4 h-fit`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted">Question Palette</h2>
        <span className="text-xs font-mono text-ink">
          {answeredCount}/{questions.length}
        </span>
      </div>

      <div
        className={`grid gap-2 mb-4 max-h-72 overflow-y-auto pr-1 ${
          prefs.palettePosition === 'bottom' ? 'grid-cols-5 sm:grid-cols-10' : 'grid-cols-5'
        }`}
      >
        {questions.map((q, idx) => {
          const isAnswered = isQuestionAnswered(q);
          const isMarked = markedForReview.includes(q.id);
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
                if (e.key === 'ArrowLeft') setCurrentIndex((i) => Math.max(0, i - 1));
              }}
              aria-label={`Question ${idx + 1}${isMarked ? ' marked for review' : isAnswered ? ' answered' : ' unanswered'}`}
              className={`min-h-[44px] rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-1 border transition-transform active:scale-[0.97] ${
                isCurrent ? 'ring-2 ring-status-current border-status-current' : 'border-line'
              } ${
                isMarked
                  ? 'bg-amber-100 text-amber-950'
                  : isAnswered
                  ? 'bg-emerald-100 text-emerald-950'
                  : 'bg-canvas text-ink-muted'
              }`}
            >
              <span>{idx + 1}</span>
              {isMarked ? (
                <Flag className="w-3 h-3 fill-current" />
              ) : isAnswered ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Square className="w-2.5 h-2.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5 text-[11px] font-mono text-ink-muted border-t border-line pt-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-status-answered" /> Answered
        </div>
        <div className="flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-status-review" /> Marked for Review
        </div>
        <div className="flex items-center gap-2">
          <Square className="w-3.5 h-3.5 text-status-unanswered" /> Unanswered
        </div>
      </div>

      <p className="mt-3 pt-3 border-t border-line text-[11px] font-mono text-ink-muted">
        Shortcuts: Alt+N Next · Alt+P Prev · Alt+M Mark · Alt+S Scratchpad
      </p>
    </aside>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {attempt.isSandbox && (
        <div className="bg-amber-200 text-amber-950 px-4 py-1.5 text-xs font-mono flex items-center justify-center gap-2">
          <FlaskConical className="w-4 h-4" />
          SANDBOX PREVIEW MODE — Responses and scores will not affect real examination statistics.
        </div>
      )}

      {/* Top Workspace Bar */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line px-3 sm:px-6 min-h-[64px] py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0 flex items-center justify-between sm:block gap-2">
          <h1 className="font-semibold text-sm sm:text-base text-ink truncate">{attempt.examTitle}</h1>
          <div className="flex items-center gap-2 text-xs font-mono shrink-0 relative">
            <button
              type="button"
              onClick={() => setShowQueueDetail((v) => !v)}
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                syncStatus === 'saved' && !effectiveOffline
                  ? 'bg-emerald-50 text-status-answered'
                  : effectiveOffline || syncStatus === 'offline'
                  ? 'bg-amber-100 text-amber-950'
                  : syncStatus === 'error'
                  ? 'bg-red-100 text-status-danger'
                  : 'bg-subtle text-ink-muted'
              }`}
            >
              {effectiveOffline
                ? `Answers kept on this device (${queuedCount})`
                : syncStatus === 'saved'
                ? 'Saved'
                : syncStatus === 'saving'
                ? 'Saving...'
                : syncStatus === 'retrying'
                ? 'Reconnecting...'
                : 'Sync failed'}
            </button>
            {showQueueDetail && (
              <div className="absolute top-7 left-0 z-40 w-64 p-3 rounded-lg bg-surface border border-line shadow-lg text-[11px] font-mono space-y-1">
                <div className="font-semibold text-ink">
                  Deadline: {new Date(attempt.deadlineAt).toLocaleTimeString()} (fixed)
                </div>
                {queuedQuestionIds.length === 0 ? (
                  <div className="text-ink-muted">All responses synced to server.</div>
                ) : (
                  <div className="text-amber-900">
                    Queued:{' '}
                    {queuedQuestionIds
                      .map((qid) => {
                        const idx = questions.findIndex((q) => q.id === qid);
                        return idx >= 0 ? `Q${idx + 1}` : qid;
                      })
                      .join(', ')}
                  </div>
                )}
              </div>
            )}
            {syncStatus === 'error' && (
              <button onClick={() => flushQueue()} className="text-cobalt hover:underline inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
            {lateSyncedCount > 0 && (
              <span className="text-[11px] text-amber-800" title="Some answers were saved after your connection returned. They were accepted. Your exam time did not change.">
                ({lateSyncedCount} late-synced · deadline unchanged)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap">
          {/* Server-Synced Timer + SVG Ring */}
          <div
            role="timer"
            aria-label="Remaining examination time"
            className={`px-3 py-1.5 rounded-lg font-mono text-sm sm:text-base font-bold tabular-nums flex items-center gap-2 border ${
              urgency === 'critical'
                ? 'bg-red-50 text-status-danger border-red-300'
                : urgency === 'warning'
                ? 'bg-amber-50 text-status-review border-amber-300'
                : 'bg-canvas text-ink border-line'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="11" r={ringR} fill="none" stroke="var(--border-line)" strokeWidth="2.5" />
              <circle
                cx="11"
                cy="11"
                r={ringR}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={urgency === 'critical' ? '3 2' : ringC}
                strokeDashoffset={urgency === 'critical' ? 0 : ringOffset}
                transform="rotate(-90 11 11)"
              />
            </svg>
            {formatted}
          </div>
          <span className="sr-only" aria-live="polite">
            {announcement}
          </span>

          <button
            onClick={() => {
              setShowAnnouncements((v) => !v);
              setUnreadAnnouncements(0);
            }}
            aria-label="Examiner announcements"
            className="relative min-h-[44px] min-w-[44px] p-2 rounded-lg border border-line bg-canvas text-ink hover:bg-subtle flex items-center justify-center"
          >
            <Bell className="w-4 h-4" />
            {unreadAnnouncements > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cobalt text-white text-[10px] font-mono flex items-center justify-center">
                {unreadAnnouncements}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowScratchpad((v) => !v)}
            aria-label="Toggle digital scratchpad"
            className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 ${
              showScratchpad ? 'bg-cobalt text-white border-cobalt' : 'bg-canvas border-line text-ink hover:bg-subtle'
            }`}
          >
            <NotebookPen className="w-4 h-4" />
            <span className="hidden sm:inline">Scratchpad</span>
          </button>

          <button
            onClick={() => setShowShortcuts((v) => !v)}
            aria-label="Keyboard shortcuts"
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-line bg-canvas text-ink hover:bg-subtle flex items-center justify-center"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowPrefs((v) => !v)}
            aria-label="Workspace preferences"
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg border border-line bg-canvas text-ink hover:bg-subtle flex items-center justify-center"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5 bg-cobalt hover:bg-navy-800 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg active:scale-[0.97]"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </button>
        </div>
      </header>

      {/* Connectivity Banner */}
      {effectiveOffline && (
        <div role="alert" className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-950 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Connection lost. Keep working: {queuedCount} answer(s) saved on this device. Your deadline has not changed ({new Date(attempt.deadlineAt).toLocaleTimeString()}).
          </span>
        </div>
      )}

      {/* Keyboard Shortcuts Popover (?) */}
      {showShortcuts && (
        <div className="bg-surface border-b border-line px-4 sm:px-6 py-3 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-ink-muted">
            <span><strong className="text-ink">← / → or P / N</strong> Prev / Next</span>
            <span><strong className="text-ink">M</strong> Mark for review</span>
            <span><strong className="text-ink">1–9</strong> Select option</span>
            <span><strong className="text-ink">Alt+S</strong> Scratchpad</span>
            <span><strong className="text-ink">Ctrl+Enter</strong> Review & Submit</span>
            <span><strong className="text-ink">Esc</strong> Close panels</span>
          </div>
          <button onClick={() => setShowShortcuts(false)} className="text-cobalt hover:underline">Close</button>
        </div>
      )}

      {/* Workspace Preferences Popover (4.7) */}
      {showPrefs && (
        <div className="bg-surface border-b border-line px-4 sm:px-6 py-3 flex flex-wrap items-center gap-5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-ink-muted">Theme:</span>
            {['light', 'dark', 'system', 'high-contrast'].map((t) => (
              <button
                key={t}
                onClick={() => updatePreference({ theme: t })}
                className={`px-2.5 py-1 rounded border capitalize ${
                  prefs.theme === t ? 'bg-cobalt text-white border-cobalt' : 'bg-canvas border-line'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pref-font-size" className="font-mono text-ink-muted">Font ({prefs.fontSizePx}px):</label>
            <input
              id="pref-font-size"
              type="range"
              min={14}
              max={22}
              step={2}
              value={prefs.fontSizePx}
              onChange={(e) => updatePreference({ fontSizePx: Number(e.target.value) })}
              className="accent-[#2F5BFF]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-ink-muted">Spacing:</span>
            {['normal', 'relaxed'].map((ls) => (
              <button
                key={ls}
                onClick={() => updatePreference({ lineSpacing: ls })}
                className={`px-2.5 py-1 rounded border capitalize ${
                  prefs.lineSpacing === ls ? 'bg-cobalt text-white border-cobalt' : 'bg-canvas border-line'
                }`}
              >
                {ls}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-ink-muted">Palette:</span>
            {['left', 'right', 'bottom'].map((pos) => (
              <button
                key={pos}
                onClick={() => updatePreference({ palettePosition: pos })}
                className={`px-2.5 py-1 rounded border capitalize ${
                  prefs.palettePosition === pos ? 'bg-cobalt text-white border-cobalt' : 'bg-canvas border-line'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 cursor-pointer font-mono text-ink-muted">
            <input
              type="checkbox"
              checked={prefs.showOptionLetters}
              onChange={(e) => updatePreference({ showOptionLetters: e.target.checked })}
              className="accent-[#2F5BFF]"
            />
            Option letters
          </label>
          <button
            onClick={() => {
              setPrefs(DEFAULT_PREFS);
              if (attempt?.id) attemptService.savePreferences(attempt.id, DEFAULT_PREFS).catch(() => {});
            }}
            className="text-cobalt font-mono hover:underline ml-auto"
          >
            Reset to defaults
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-6 ${
          prefs.palettePosition === 'bottom' ? 'flex-col' : 'flex-col lg:flex-row'
        }`}
      >
        {prefs.palettePosition === 'left' && paletteAside}

        <main className={`flex-1 bg-surface border border-line rounded-xl ${paddingClass} flex flex-col justify-between`}>
          {currentQ ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-navy-50 text-cobalt">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-mono text-ink-muted">{currentQ.topic}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-semibold text-ink">{currentQ.marks} marks</span>
                  {currentQ.negativeMarks > 0 && (
                    <span className="text-status-danger">(-{currentQ.negativeMarks} wrong)</span>
                  )}
                </div>
              </div>

              <p
                dir="auto"
                style={{ fontSize: `${Math.max(20, (prefs.fontSizePx || 16) + 6)}px` }}
                className={`${lineSpacingClass} font-serif text-ink mb-6 max-w-[62ch] break-words`}
              >
                {currentQ.text}
              </p>

              {currentQ.type === 'mcq_single' && (
                <div className="space-y-2.5" role="radiogroup" aria-label="Answer choices">
                  {currentQ.options.map((opt, oIdx) => {
                    const selected = answers[currentQ.id] === opt.id;
                    const letter = String.fromCharCode(65 + oIdx);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3.5 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
                          selected
                            ? 'bg-navy-50 border-cobalt text-ink'
                            : 'bg-canvas border-line hover:bg-subtle'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQ.id}`}
                          checked={selected}
                          onChange={() => enqueueAnswer(currentQ.id, opt.id)}
                          className="mt-1 accent-[#2F5BFF]"
                        />
                        <span style={fontSizeStyle} className="leading-snug">
                          {prefs.showOptionLetters && (
                            <span className="font-mono text-xs text-ink-muted mr-2">{letter}.</span>
                          )}
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'mcq_multi' && (
                <div className="space-y-2.5">
                  <p className="text-xs font-mono text-ink-muted mb-2">
                    Select all applicable options ({currentQ.multiSelectRule === 'partial' ? 'Partial credit' : 'All-or-nothing'}).
                  </p>
                  {currentQ.options.map((opt, oIdx) => {
                    const selected = Array.isArray(answers[currentQ.id]) && answers[currentQ.id].includes(opt.id);
                    const letter = String.fromCharCode(65 + oIdx);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 p-3.5 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
                          selected
                            ? 'bg-navy-50 border-cobalt text-ink'
                            : 'bg-canvas border-line hover:bg-subtle'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMultiOption(currentQ.id, opt.id)}
                          className="mt-1 accent-[#2F5BFF]"
                        />
                        <span style={fontSizeStyle} className="leading-snug">
                          {prefs.showOptionLetters && (
                            <span className="font-mono text-xs text-ink-muted mr-2">{letter}.</span>
                          )}
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'written' && (
                <div>
                  <textarea
                    rows={8}
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => enqueueAnswer(currentQ.id, e.target.value)}
                    placeholder="Write your response clearly..."
                    style={fontSizeStyle}
                    className="w-full p-3.5 rounded-lg border border-line bg-canvas text-ink"
                  />
                  <div className="mt-1.5 text-right text-[11px] font-mono text-ink-muted">
                    {((answers[currentQ.id] || '').trim().split(/\s+/).filter(Boolean)).length} words · {(answers[currentQ.id] || '').length} chars
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No questions in this examination.</p>
          )}

          <div className="pt-6 mt-8 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-line bg-canvas disabled:opacity-40 hover:bg-subtle active:scale-[0.97]"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentQ && (
              <button
                onClick={() => toggleMarkForReview(currentQ.id)}
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border active:scale-[0.97] ${
                  markedForReview.includes(currentQ.id)
                    ? 'bg-amber-100 border-amber-400 text-amber-950'
                    : 'bg-canvas border-line text-ink hover:bg-subtle'
                }`}
              >
                <Flag className="w-4 h-4" />
                {markedForReview.includes(currentQ.id) ? 'Unmark Review' : 'Mark for Review'}
              </button>
            )}

            <button
              disabled={currentIndex >= questions.length - 1}
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-cobalt text-white disabled:opacity-40 hover:bg-navy-800 active:scale-[0.97]"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {(prefs.palettePosition === 'right' || prefs.palettePosition === 'bottom') && paletteAside}

        {/* Digital Scratchpad Drawer (4.8) */}
        {showScratchpad && (
          <aside
            aria-label="Digital scratchpad"
            className="fixed inset-x-3 bottom-3 z-40 lg:static lg:inset-auto lg:w-72 shrink-0 bg-surface border border-line rounded-xl p-4 flex flex-col shadow-lg lg:shadow-none"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted">Digital Scratchpad</h2>
              <button onClick={() => setShowScratchpad(false)} className="text-xs text-ink-muted hover:text-ink">
                Close
              </button>
            </div>
            <textarea
              rows={8}
              value={scratchpad}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              placeholder="Rough notes, calculations, outlines... (auto-saved, not graded)"
              className="flex-1 w-full p-3 text-xs font-mono bg-canvas border border-line rounded-lg text-ink"
            />
          </aside>
        )}

        {/* Announcements Drawer */}
        {showAnnouncements && (
          <aside
            aria-label="Examiner announcements"
            className="fixed inset-x-3 bottom-3 z-40 lg:static lg:inset-auto lg:w-72 shrink-0 bg-surface border border-line rounded-xl p-4 flex flex-col shadow-lg lg:shadow-none"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted">Announcements</h2>
              <button onClick={() => setShowAnnouncements(false)} className="text-xs text-ink-muted hover:text-ink">
                Close
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-64 lg:max-h-96">
              {announcements.length === 0 ? (
                <p className="text-xs text-ink-muted">No announcements from the examiner yet.</p>
              ) : (
                announcements.map((an) => (
                  <div key={an.id} className="p-3 rounded-lg bg-canvas border border-line text-xs">
                    <p className="text-ink">{an.message}</p>
                    <span className="text-[10px] font-mono text-ink-muted block mt-1">
                      {new Date(an.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Review & Confirm Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-surface border border-line rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-serif text-2xl text-ink">Review & Submit</h2>
            </div>
            <p className="text-sm text-ink-muted">
              Review your question status below. Once submitted, responses cannot be changed.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center bg-canvas p-3 rounded-lg border border-line font-mono text-xs">
              <div>
                <div className="text-lg font-bold text-status-answered">{answeredCount}</div>
                <div className="text-ink-muted">Answered</div>
              </div>
              <div>
                <div className="text-lg font-bold text-ink">{questions.length - answeredCount}</div>
                <div className="text-ink-muted">Unanswered</div>
              </div>
              <div>
                <div className="text-lg font-bold text-status-review">{markedForReview.length}</div>
                <div className="text-ink-muted">Marked</div>
              </div>
            </div>

            {/* Jump links to unanswered or marked questions */}
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {questions.map((q, idx) => {
                const ans = isQuestionAnswered(q);
                const mk = markedForReview.includes(q.id);
                if (ans && !mk) return null;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowSubmitModal(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono border ${
                      mk ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-canvas border-line text-ink-muted'
                    }`}
                  >
                    Jump Q{idx + 1} {mk ? '(Marked)' : '(Unanswered)'}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="min-h-[44px] px-4 py-2 text-sm border border-line rounded-lg bg-canvas"
              >
                Return to Exam
              </button>
              <button
                disabled={submitting}
                onClick={() => handleFinalSubmit(false)}
                className="min-h-[44px] px-5 py-2 text-sm font-semibold bg-cobalt text-white rounded-lg active:scale-[0.97]"
              >
                {submitting ? 'Submitting...' : 'Confirm Final Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
