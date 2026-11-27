import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { examService } from '../../services/examService';
import { usePolling } from '../../hooks/usePolling';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Badge, Drawer } from '../../components/ui';
import { toast } from 'sonner';
import { Megaphone, AlertCircle, Wifi, RefreshCw } from 'lucide-react';

export const ExamMonitorPage = () => {
  const { id } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filterState, setFilterState] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const fetchMonitor = useCallback(async () => {
    const res = await examService.getMonitor(id);
    setAttempts(res.data?.attempts || []);
    setAnnouncements(res.data?.announcements || []);
  }, [id]);

  const { lastSyncedAt, pollError, refresh } = usePolling(fetchMonitor, 4000, true);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await examService.postAnnouncement(id, message.trim());
      setMessage('');
      toast.success('Announcement broadcast to active candidates');
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const inProgressCount = attempts.filter((a) => a.status === 'in_progress').length;
  const submittedCount = attempts.filter((a) => a.status === 'submitted' || a.status === 'graded').length;

  const filtered = attempts.filter((a) => {
    const matchState = filterState === 'all' || a.status === filterState;
    const matchText = !search || a.candidateName.toLowerCase().includes(search.toLowerCase());
    return matchState && matchText;
  });

  return (
    <main className="space-y-6">
      <PageHeader
        title="Live Examination Monitor"
        subtitle="4s polling · Server-authoritative status & connectivity ledger."
        breadcrumbs={[{ label: 'Examiner', to: '/examiner' }, { label: 'Live Monitor' }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={pollError ? 'danger' : 'success'}>
              <Wifi className="w-3.5 h-3.5" />
              {lastSyncedAt ? `Last synced ${lastSyncedAt.toLocaleTimeString()}` : 'Syncing...'}
            </Badge>
            <Button size="sm" variant="secondary" onClick={refresh}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>
          <strong>Review Notice:</strong> Monitoring events (tab switches, disconnect intervals, late-synced answers) are indicators for review, not conclusive evidence of misconduct.
        </span>
      </div>

      {/* Live Counts */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-line rounded-2xl p-4">
          <div className="text-xs font-mono text-ink-muted uppercase">Total Attempts</div>
          <div className="font-display font-bold text-3xl text-ink tabular-nums mt-1">{attempts.length}</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4">
          <div className="text-xs font-mono text-ink-muted uppercase">In Progress</div>
          <div className="font-display font-bold text-3xl text-[#059669] tabular-nums mt-1">{inProgressCount}</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4">
          <div className="text-xs font-mono text-ink-muted uppercase">Submitted</div>
          <div className="font-display font-bold text-3xl text-status-answered tabular-nums mt-1">{submittedCount}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-surface border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter candidate..."
              className="px-3 py-1.5 text-xs bg-canvas border border-line rounded-lg"
            />
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono bg-canvas border border-line rounded-lg"
            >
              <option value="all">All States</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-xs font-mono text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5">Indicators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-muted text-xs font-mono">
                      No matching attempts.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const pct = a.totalQuestions ? Math.round((a.answeredCount / a.totalQuestions) * 100) : 0;
                    return (
                      <tr
                        key={a.attemptId}
                        onClick={() => setSelectedAttempt(a)}
                        className="hover:bg-canvas/70 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-ink">{a.candidateName}</td>
                        <td className="px-4 py-3 font-mono text-xs">{a.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <div className="w-20 h-2 bg-canvas rounded-full overflow-hidden border border-line">
                              <div className="bg-cobalt h-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span>{a.answeredCount}/{a.totalQuestions}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                          {a.lateSyncedCount > 0 && (
                            <Badge tone="warning" className="mr-1">{a.lateSyncedCount} late</Badge>
                          )}
                          {a.events?.length || 0} event(s)
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface border border-line rounded-xl p-4 space-y-4 h-fit">
          <div className="flex items-center gap-2 font-semibold text-sm text-ink">
            <Megaphone className="w-4 h-4 text-cobalt" />
            Broadcast Announcement
          </div>
          <form onSubmit={handleBroadcast} className="space-y-2">
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a live clarification to all candidates..."
              className="w-full p-2.5 text-sm bg-canvas border border-line rounded-lg"
            />
            <Button type="submit" loading={sending} className="w-full">
              Send Announcement
            </Button>
          </form>

          <div className="pt-3 border-t border-line space-y-2">
            <h3 className="text-xs font-mono uppercase text-ink-muted">5.3 How Resilience Works</h3>
            <ol className="text-xs text-ink-muted space-y-1.5 list-decimal list-inside">
              <li>Server sets an immutable <code className="font-mono">deadlineAt</code> at attempt start.</li>
              <li>Candidate answers queue locally with monotonic <code className="font-mono">seq</code> during outages.</li>
              <li>On reconnect, queued answers flush in order within a bounded 3-min late-sync window.</li>
              <li>Trade-off: no extra time is ever granted; late-synced answers are flagged for review.</li>
            </ol>
          </div>

          <div className="pt-3 border-t border-line space-y-2">
            <h3 className="text-xs font-mono uppercase text-ink-muted">Broadcast History</h3>
            {announcements.length === 0 ? (
              <p className="text-xs text-ink-muted">None sent yet.</p>
            ) : (
              announcements.map((an) => (
                <div key={an.id} className="p-2.5 rounded-lg bg-canvas border border-line text-xs">
                  <p className="text-ink">{an.message}</p>
                  <span className="text-[10px] font-mono text-ink-muted">
                    {new Date(an.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Drawer
        open={Boolean(selectedAttempt)}
        onClose={() => setSelectedAttempt(null)}
        title={selectedAttempt ? `${selectedAttempt.candidateName} — Timeline` : 'Attempt Timeline'}
      >
        {selectedAttempt && (
          <div className="space-y-3 text-xs font-mono">
            <div>Status: <strong>{selectedAttempt.status}</strong></div>
            <div>Progress: {selectedAttempt.answeredCount}/{selectedAttempt.totalQuestions}</div>
            <div className="pt-2 border-t border-line">
              <div className="text-ink-muted mb-1">Connectivity Timeline (5.3)</div>
              <p className="text-[11px] text-ink-muted mb-2">Gaps are context, not evidence of misconduct.</p>
              <div className="h-3 w-full rounded bg-emerald-200 overflow-hidden flex mb-2" aria-label="Connectivity strip">
                <div className="bg-status-answered flex-1" />
                {(selectedAttempt.connectivityLedger || []).map((_, idx) => (
                  <div key={idx} className="bg-status-review w-6" title="Disconnected interval" />
                ))}
                <div className="bg-status-answered flex-1" />
              </div>
              {(selectedAttempt.connectivityLedger || []).length === 0 ? (
                <p className="text-ink-muted">Continuous connection — no recorded outages.</p>
              ) : (
                selectedAttempt.connectivityLedger.map((gap, i) => (
                  <div key={i} className="p-2 rounded bg-canvas border border-line mb-1">
                    Outage: {gap.durationSec}s · Late-synced: {selectedAttempt.lateSyncedCount || 0}
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-line">
              <div className="text-ink-muted mb-1">Activity Indicators</div>
              {(selectedAttempt.events || []).length === 0 ? (
                <p className="text-ink-muted">No indicators recorded.</p>
              ) : (
                selectedAttempt.events.map((ev, i) => (
                  <div key={i} className="p-2 rounded bg-canvas border border-line mb-1">
                    {ev.type} · {new Date(ev.at).toLocaleTimeString()}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Drawer>
    </main>
  );
};
