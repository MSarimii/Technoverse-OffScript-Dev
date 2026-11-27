import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { PageHeader } from '../../components/layout/AppLayout';
import { getInitials } from '../../lib/initials';
import { sanitizeCell } from '../../lib/csv';
import { Button, Input, Select, Badge, Dialog, Skeleton, EmptyState, ErrorState, Tooltip, BentoAreaChart, BentoDonutChart } from '../../components/ui';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { UserPlus, Search, ShieldAlert, Users, ShieldCheck, GraduationCap, BookOpen, Download, Copy, Check } from 'lucide-react';

const PAGE_SIZE = 8;

export const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const { resolvedTheme } = useTheme();
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
  const [copiedEmailId, setCopiedEmailId] = useState(null);
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

  const handleCopyEmail = (user) => {
    if (!user?.email) return;
    navigator.clipboard?.writeText(user.email)?.catch(() => {});
    setCopiedEmailId(user.id);
    toast.success(`Copied ${user.email}`);
    setTimeout(() => setCopiedEmailId((prev) => (prev === user.id ? null : prev)), 1500);
  };

  const handleExportCsv = () => {
    const header = ['Name', 'Email', 'Role', 'Status'];
    const lines = [
      header.join(','),
      ...filtered.map((u) =>
        [u.name, u.email, u.role, u.isActive ? 'active' : 'inactive']
          .map((cell) => `"${sanitizeCell(cell).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sems-users.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? 'user' : 'users'} to CSV`);
  };

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

      {/* Minimalist 4-Card KPI Strip */}
      <section aria-label="Account summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', val: users.length, caption: '+12% this month', icon: Users },
          { label: 'Administrators', val: adminCount, caption: 'Full governance', icon: ShieldCheck },
          { label: 'Examiners', val: examinerCount, caption: 'Active faculty', icon: BookOpen },
          { label: 'Candidates', val: candidateCount, caption: 'Enrolled cohort', icon: GraduationCap },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">
                  {kpi.label}
                </span>
                <Icon className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="font-display font-bold text-3xl text-[var(--ink)] tabular-nums tracking-[-0.03em]">
                {kpi.val}
              </div>
              <span className="text-xs text-[var(--muted)]">{kpi.caption}</span>
            </div>
          );
        })}
      </section>

      {/* Interactive Bento Analytics Row */}
      <section aria-label="Platform analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">7-Day Telemetry</p>
            <h2 className="text-lg font-display font-bold text-[var(--ink)] tracking-[-0.03em]">
              Platform Activity & Provisioning
            </h2>
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

        <div className="min-w-0 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">Access Control</p>
            <h2 className="text-lg font-display font-bold text-[var(--ink)] tracking-[-0.03em]">
              Role & Access Split
            </h2>
          </div>
          <BentoDonutChart
            data={[
              { name: 'Administrators', value: adminCount, color: resolvedTheme === 'dark' ? '#F4F4F5' : '#0A0A0A' },
              { name: 'Examiners', value: examinerCount, color: '#10B981' },
              { name: 'Candidates', value: candidateCount, color: resolvedTheme === 'dark' ? '#64748B' : '#94A3B8' },
            ]}
          />
        </div>
      </section>

      {/* Unified Table Card with Anchored Toolbar */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-4 border-b border-[var(--line)] bg-[var(--surface)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex items-center flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 pointer-events-none" />
              <input
                type="text"
                aria-label="Search users"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email..."
                className="w-full h-9 pl-9 pr-3 text-sm bg-canvas border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-zinc-400 dark:focus:border-white/25"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 text-xs font-medium rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] hover:border-zinc-400 dark:hover:border-white/20 transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="examiner">Examiner</option>
                <option value="candidate">Candidate</option>
              </select>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 text-xs font-medium rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] hover:border-zinc-400 dark:hover:border-white/20 transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center px-2.5 h-7 rounded-full bg-zinc-100 dark:bg-white/[0.06] border border-[var(--line)] text-[11px] font-mono tabular-nums text-[var(--muted)]">
              {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
            </span>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="h-9 px-3 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-zinc-100 dark:hover:bg-white/5 border border-[var(--line)] inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              Export CSV
            </button>
          </div>
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
                <thead className="bg-zinc-50/80 dark:bg-white/[0.02] border-b border-[var(--line)] text-[var(--muted)] text-[11px] uppercase font-mono tracking-[0.08em]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {paged.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isCopied = copiedEmailId === u.id;
                    return (
                      <motion.tr
                        key={u.id}
                        layout={!reduced}
                        transition={{ layout: { type: 'spring', stiffness: 420, damping: 34 } }}
                        className="group hover:bg-zinc-50/80 dark:hover:bg-white/[0.025] transition-colors"
                      >
                        <td className="px-4 py-3.5 font-medium text-[var(--ink)]">
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
                        <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted)]">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{u.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(u)}
                              aria-label={isCopied ? `Copied ${u.email}` : `Copy ${u.email}`}
                              className={`p-1 rounded-md transition-opacity hover:bg-zinc-200/70 dark:hover:bg-white/10 ${
                                isCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                              }`}
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-[#10B981]" strokeWidth={2.25} />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" strokeWidth={1.75} />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            aria-label={`Role for ${u.name}`}
                            disabled={isSelf}
                            value={u.role}
                            onChange={(e) => setPendingRoleChange({ user: u, nextRole: e.target.value })}
                            className="h-8 px-2.5 text-xs font-medium rounded-lg bg-zinc-50/80 dark:bg-white/[0.04] border border-[var(--line)] hover:border-zinc-400 dark:hover:border-white/20 text-[var(--ink)] disabled:opacity-50 transition-colors"
                          >
                            <option value="candidate">candidate</option>
                            <option value="examiner">examiner</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={u.isActive ? 'success' : 'danger'}>
                            {u.isActive ? 'active' : 'inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right relative">
                          {isSelf ? (
                            <Tooltip label="Current session">
                              <button
                                disabled
                                className="h-8 px-3 rounded-lg text-xs font-medium border border-transparent text-[var(--muted)] opacity-40 cursor-not-allowed"
                              >
                                Deactivate
                              </button>
                            </Tooltip>
                          ) : u.isActive ? (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => setConfirmDeactivateId(confirmDeactivateId === u.id ? null : u.id)}
                                className="h-8 px-3 rounded-lg text-xs font-medium border border-transparent text-[var(--muted)] hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:text-red-400 dark:hover:bg-red-500/10 dark:hover:border-red-500/20 transition-colors"
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
                              className="h-8 px-3 rounded-lg text-xs font-medium border border-transparent text-[#059669] dark:text-emerald-400 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/20 transition-colors"
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

            <div className="px-4 py-3 border-t border-[var(--line)] bg-zinc-50/50 dark:bg-white/[0.015] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--muted)]">
              <span className="tabular-nums">
                Showing {paged.length} of {filtered.length} users (Page {safePage}/{totalPages})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 rounded-lg text-xs font-sans font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === safePage ? 'page' : undefined}
                    className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-mono tabular-nums font-medium border transition-colors ${
                      pageNum === safePage
                        ? 'bg-[#0A0A0A] text-white border-[#0A0A0A] dark:bg-[#F4F4F5] dark:text-[#0A0A0A] dark:border-[#F4F4F5]'
                        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-zinc-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 rounded-lg text-xs font-sans font-medium border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
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
