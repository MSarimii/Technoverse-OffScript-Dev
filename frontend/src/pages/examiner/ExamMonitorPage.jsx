import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { examService } from '../../services/examService';
import { toast } from 'sonner';
import { ArrowLeft, Megaphone, AlertCircle, Wifi } from 'lucide-react';

export const ExamMonitorPage = () => {
  const { id } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMonitor = useCallback(async () => {
    try {
      const res = await examService.getMonitor(id);
      setAttempts(res.data?.attempts || []);
      setAnnouncements(res.data?.announcements || []);
    } catch {
      // silent poll retry
    }
  }, [id]);

  useEffect(() => {
    fetchMonitor();
    const timer = setInterval(fetchMonitor, 4000);
    return () => clearInterval(timer);
  }, [fetchMonitor]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await examService.postAnnouncement(id, message.trim());
      setMessage('');
      toast.success('Announcement broadcast to active candidates');
      fetchMonitor();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/examiner" className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-ink mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to console
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Live Examination Monitor</h1>
          <p className="text-sm text-ink-muted">Polling every 4 seconds · Server-authoritative status & connectivity ledger.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-status-answered text-xs font-mono">
          <Wifi className="w-3.5 h-3.5" /> Live Polling Active
        </span>
      </div>

      {/* Incident disclaimer */}
      <div className="mb-6 p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>
          <strong>Review Notice:</strong> Monitoring events (tab switches, disconnect intervals, late-synced answers) are contextual indicators for review, not conclusive evidence of misconduct.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-surface border border-line rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-line font-semibold text-sm">
            Candidate Attempts ({attempts.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-xs font-mono text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-2.5">Candidate</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5">5.3 Ledger / Indicators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-ink-muted text-xs font-mono">
                      No active or submitted attempts yet.
                    </td>
                  </tr>
                ) : (
                  attempts.map((a) => (
                    <tr key={a.attemptId}>
                      <td className="px-4 py-3 font-medium text-ink">{a.candidateName}</td>
                      <td className="px-4 py-3 font-mono text-xs">{a.status}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {a.answeredCount} / {a.totalQuestions}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                        {a.lateSyncedCount > 0 && (
                          <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                            {a.lateSyncedCount} late-synced
                          </span>
                        )}
                        {a.connectivityLedger?.length > 0 && (
                          <span>{a.connectivityLedger.length} outage(s)</span>
                        )}
                        {a.events?.length > 0 && (
                          <span className="ml-2">{a.events.length} indicator(s)</span>
                        )}
                        {!a.lateSyncedCount && !a.connectivityLedger?.length && !a.events?.length && 'Normal'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface border border-line rounded-lg p-4 space-y-4 h-fit">
          <div className="flex items-center gap-2 font-semibold text-sm text-ink">
            <Megaphone className="w-4 h-4 text-navy-800" />
            Broadcast Announcement
          </div>
          <form onSubmit={handleBroadcast} className="space-y-2">
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a live clarification to all candidates..."
              className="w-full p-2.5 text-sm bg-canvas border border-line rounded-md"
            />
            <button
              disabled={sending}
              type="submit"
              className="w-full py-2 text-sm font-semibold bg-navy-900 text-white rounded-md"
            >
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </form>

          <div className="pt-3 border-t border-line space-y-2">
            <h3 className="text-xs font-mono uppercase text-ink-muted">Recent Broadcasts</h3>
            {announcements.length === 0 ? (
              <p className="text-xs text-ink-muted">None sent yet.</p>
            ) : (
              announcements.map((an) => (
                <div key={an.id} className="p-2.5 rounded bg-canvas border border-line text-xs">
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
    </main>
  );
};
