import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/layout/AppLayout';
import { getInitials } from '../../lib/initials';
import { Button, Input, Select, Badge, Dialog, Skeleton, EmptyState, ErrorState, Tooltip, BentoAreaChart, BentoDonutChart } from '../../components/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { UserPlus, Search, ShieldAlert, Users, ShieldCheck, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';

const PAGE_SIZE = 8;

export const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });

  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { user, nextRole }
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);
  const reduced = useReducedMotion();

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getUsers();
      setUsers(res.data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const res = await adminService.createUser(form);
      setUsers((prev) => [res.data.user, ...prev]);
      setForm({ name: '', email: '', password: '', role: 'candidate' });
      setShowCreate(false);
      toast.success('User account provisioned');
    } catch (err) {
      toast.error(err.message || 'Could not create user');
    } finally {
      setCreating(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { user, nextRole } = pendingRoleChange;
    if (user.id === currentUser?.id) {
      toast.error('Self-lockout protection: you cannot change your own role.');
      setPendingRoleChange(null);
      return;
    }
    try {
      await adminService.updateUser(user.id, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      toast.success(`Updated ${user.name}'s role to ${nextRole}`);
    } catch (err) {
      toast.error(err.message || 'Role update failed');
    } finally {
      setPendingRoleChange(null);
    }
  };

  const handleToggleActive = async (target) => {
    if (target.id === currentUser?.id) {
      toast.error('Self-lockout protection: you cannot deactivate your own account.');
      return;
    }
    const previous = target.isActive;
    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isActive: !previous } : u)));
    try {
      await adminService.updateUser(target.id, { isActive: !previous });
      toast.success(!previous ? `${target.name} activated` : `${target.name} deactivated`);
    } catch (err) {
      // Rollback on failure
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isActive: previous } : u)));
      toast.error(err.message || 'Status update failed — rolled back');
    }
  };

  const filtered = users.filter((u) => {
    const matchText =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? u.isActive : !u.isActive);
    return matchText && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const examinerCount = users.filter((u) => u.role === 'examiner').length;
  const candidateCount = users.filter((u) => u.role === 'candidate').length;

  const avatarClass = (role) =>
    role === 'admin'
      ? 'bg-[#0B0F0E] text-white'
      : role === 'examiner'
      ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
      : 'bg-subtle text-ink border border-line';

  return (
    <main className="space-y-6">
      <PageHeader
        title="User & Role Administration"
        subtitle="Provision accounts, manage roles, and enforce access control."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <UserPlus className="w-4 h-4" /> Provision User
          </Button>
        }
      />

      {/* Bento 4-Card KPI Strip with Jet-Black Anchor */}
      <section aria-label="Account summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0A0A0A] border border-[#181F1D] text-white p-5 shadow-md flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-white/60">Total Accounts</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-[#10B981]">
              <TrendingUp className="w-3 h-3" /> +12% this month
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="font-display font-bold text-3xl text-white tabular-nums tracking-[-0.03em]">
              {users.length}
            </div>
            <svg width="64" height="22" viewBox="0 0 64 22" aria-hidden="true" className="text-[#10B981] shrink-0">
              <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="2,18 14,15 26,16 38,9 50,11 62,3" />
            </svg>
          </div>
        </div>

        {[
          { label: 'Administrators', val: adminCount, trend: 'Full governance', icon: ShieldCheck, tone: 'text-ink-muted' },
          { label: 'Examiners', val: examinerCount, trend: 'Active faculty', icon: BookOpen, tone: 'text-[#059669]' },
          { label: 'Candidates', val: candidateCount, trend: 'Enrolled cohort', icon: GraduationCap, tone: 'text-ink-muted' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">{kpi.label}</span>
                <span className="w-8 h-8 rounded-lg bg-[#F4F4F5] dark:bg-white/5 border border-line/60 flex items-center justify-center text-ink-muted">
                  <Icon className="w-4 h-4" strokeWidth={1.6} aria-hidden="true" />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-display font-bold text-3xl text-ink tabular-nums tracking-[-0.03em]">
                  {kpi.val}
                </div>
                <span className={`text-[11px] font-mono ${kpi.tone}`}>{kpi.trend}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Interactive Bento Analytics Row */}
      <section aria-label="Platform analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0 rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">7-Day Telemetry</p>
              <h2 className="text-lg font-display font-bold text-ink tracking-[-0.03em]">
                Platform Activity & Provisioning
              </h2>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#059669] dark:text-[#34D399] border border-[#A7F3D0] dark:border-emerald-500/30">
              Live Sync
            </span>
          </div>
          <BentoAreaChart
            data={[
              { label: 'Mon', sessions: 118, provisioned: 12 },
              { label: 'Tue', sessions: 142, provisioned: 19 },
              { label: 'Wed', sessions: 136, provisioned: 15 },
              { label: 'Thu', sessions: 168, provisioned: 24 },
              { label: 'Fri', sessions: 194, provisioned: 31 },
              { label: 'Sat', sessions: 156, provisioned: 18 },
              { label: 'Sun', sessions: Math.max(180, users.length * 14), provisioned: users.length },
            ]}
            dataKey="sessions"
            secondaryKey="provisioned"
            name="Active Sessions"
            secondaryName="Accounts"
          />
        </div>

        <div className="min-w-0 rounded-2xl bg-surface dark:bg-[#111615] border border-line p-5 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">Access Control</p>
            <h2 className="text-lg font-display font-bold text-ink tracking-[-0.03em]">
              Role & Access Split
            </h2>
          </div>
          <BentoDonutChart
            data={[
              { name: 'Administrators', value: adminCount, color: '#0A0A0A' },
              { name: 'Examiners', value: examinerCount, color: '#10B981' },
              { name: 'Candidates', value: candidateCount, color: '#94A3B8' },
            ]}
          />
        </div>
      </section>

      {/* Unified Table Card with Inline Toolbar */}
      <div className="luxury-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-line bg-surface grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative flex items-center">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              aria-label="Search users"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-sm bg-canvas border border-line rounded-lg text-ink"
            />
          </div>
          <Select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="examiner">Examiner</option>
            <option value="candidate">Candidate</option>
          </Select>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={loadUsers} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No matching users"
              description="Adjust your search or role filters, or provision a new user."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle/70 text-ink-muted text-[11px] uppercase font-mono tracking-[0.08em]">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paged.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <motion.tr
                        key={u.id}
                        layout={!reduced}
                        transition={{ layout: { type: 'spring', stiffness: 420, damping: 34 } }}
                        className="hover:bg-canvas/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-ink">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-8 h-8 rounded-full font-mono text-xs font-semibold flex items-center justify-center shrink-0 ${avatarClass(u.role)}`}
                            >
                              {getInitials(u.name)}
                            </span>
                            <span>{u.name}</span>
                            {isSelf && <Badge tone="cobalt">You</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Role for ${u.name}`}
                            disabled={isSelf}
                            value={u.role}
                            onChange={(e) => setPendingRoleChange({ user: u, nextRole: e.target.value })}
                            className="px-3 py-1 min-h-[32px] text-xs font-mono bg-subtle/70 border border-line hover:border-line-strong rounded-full disabled:opacity-50"
                          >
                            <option value="candidate">candidate</option>
                            <option value="examiner">examiner</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={u.isActive ? 'success' : 'danger'}>
                            {u.isActive ? 'active' : 'inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right relative">
                          {isSelf ? (
                            <Tooltip label="Current session">
                              <button
                                disabled
                                className="px-2.5 py-1 rounded-full text-xs font-medium text-[#64748B] opacity-45 cursor-not-allowed"
                              >
                                Deactivate
                              </button>
                            </Tooltip>
                          ) : u.isActive ? (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => setConfirmDeactivateId(confirmDeactivateId === u.id ? null : u.id)}
                                className="px-2.5 py-1 rounded-full text-xs font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                              >
                                Deactivate
                              </button>
                              <AnimatePresence>
                                {confirmDeactivateId === u.id && (
                                  <motion.div
                                    initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.94, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
                                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                                    style={{ transformOrigin: 'top right' }}
                                    className="absolute right-0 top-9 z-30 w-52 p-3 rounded-xl luxury-card text-left space-y-2"
                                  >
                                    <p className="text-xs font-medium text-ink">Deactivate user?</p>
                                    <div className="flex justify-end gap-1.5">
                                      <Button size="sm" variant="secondary" onClick={() => setConfirmDeactivateId(null)}>
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => {
                                          setConfirmDeactivateId(null);
                                          handleToggleActive(u);
                                        }}
                                      >
                                        Confirm
                                      </Button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="px-2.5 py-1 rounded-full text-xs font-medium text-[#059669] hover:bg-[#ECFDF5] transition-colors"
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-line flex items-center justify-between text-xs font-mono text-ink-muted">
              <span>
                Showing {paged.length} of {filtered.length} users (Page {safePage}/{totalPages})
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Provision User Account">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Amina Raza"
          />
          <Input
            label="Institutional Email"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="amina@sems.edu"
          />
          <Input
            label="Initial Password"
            required
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Minimum 6 characters"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="candidate">Candidate</option>
            <option value="examiner">Examiner</option>
            <option value="admin">Administrator</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create User
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Role Change Dialog */}
      <Dialog
        open={Boolean(pendingRoleChange)}
        onClose={() => setPendingRoleChange(null)}
        title="Confirm Role Change"
      >
        {pendingRoleChange && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 text-sm text-ink">
              <ShieldAlert className="w-5 h-5 text-status-review shrink-0 mt-0.5" />
              <p>
                Change <strong>{pendingRoleChange.user.name}</strong>&apos;s role from{' '}
                <code className="font-mono">{pendingRoleChange.user.role}</code> to{' '}
                <code className="font-mono">{pendingRoleChange.nextRole}</code>?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingRoleChange(null)}>
                Cancel
              </Button>
              <Button onClick={confirmRoleChange}>Confirm Change</Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
};
