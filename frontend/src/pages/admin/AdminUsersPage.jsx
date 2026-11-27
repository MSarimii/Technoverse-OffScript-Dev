import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import { PageHeader } from '../../components/layout/AppLayout';
import { Button, Input, Select, Badge, Dialog, Skeleton, EmptyState, ErrorState } from '../../components/ui';
import { toast } from 'sonner';
import { UserPlus, Search, ShieldAlert } from 'lucide-react';

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

  return (
    <main>
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

      {/* Filters */}
      <div className="bg-surface border border-line rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
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
            className="w-full pl-9 pr-3 py-2 min-h-[44px] text-sm bg-canvas border border-line rounded-lg text-ink"
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
        <div className="space-y-3 bg-surface border border-line rounded-xl p-5">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadUsers} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching users"
          description="Adjust your search or role filters, or provision a new user."
        />
      ) : (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-ink-muted text-xs uppercase font-mono">
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
                    <tr key={u.id} className="hover:bg-canvas/60">
                      <td className="px-4 py-3 font-medium text-ink">
                        {u.name}
                        {isSelf && (
                          <Badge tone="cobalt" className="ml-2">You</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Role for ${u.name}`}
                          disabled={isSelf}
                          value={u.role}
                          onChange={(e) => setPendingRoleChange({ user: u, nextRole: e.target.value })}
                          className="px-2 py-1.5 min-h-[36px] text-xs font-mono bg-canvas border border-line rounded-lg disabled:opacity-50"
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
                      <td className="px-4 py-3 text-right">
                        <button
                          disabled={isSelf}
                          onClick={() => handleToggleActive(u)}
                          title={isSelf ? 'Cannot deactivate yourself' : ''}
                          className="text-xs font-medium text-cobalt hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
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
        </div>
      )}

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
