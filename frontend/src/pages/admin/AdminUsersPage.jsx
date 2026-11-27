import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { toast } from 'sonner';
import { UserPlus, Search } from 'lucide-react';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers();
      setUsers(res.data?.users || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await adminService.createUser(form);
      setUsers((prev) => [res.data.user, ...prev]);
      setForm({ name: '', email: '', password: '', role: 'candidate' });
      setShowCreate(false);
      toast.success('User account created');
    } catch (err) {
      toast.error(err.message || 'Could not create user');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await adminService.updateUser(id, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await adminService.updateUser(id, { isActive: !current });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !current } : u)));
      toast.success(!current ? 'User activated' : 'User deactivated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">User & Role Administration</h1>
          <p className="text-sm text-ink-muted">Provision accounts, assign roles, and manage access.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-md active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          Provision User
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-surface border border-line rounded-lg p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Full Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              placeholder="Amina Raza"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
              placeholder="amina@sems.edu"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-canvas border border-line rounded-md"
            >
              <option value="candidate">Candidate</option>
              <option value="examiner">Examiner</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-navy-900 text-white text-sm font-semibold py-2 rounded-md">
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 text-sm border border-line rounded-md bg-canvas"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="p-4 border-b border-line flex items-center gap-2">
          <Search className="w-4 h-4 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full text-sm bg-transparent focus:outline-none text-ink"
          />
        </div>

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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted font-mono">
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1 text-xs font-mono bg-canvas border border-line rounded"
                      >
                        <option value="candidate">candidate</option>
                        <option value="examiner">examiner</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                          u.isActive ? 'bg-emerald-50 text-status-answered' : 'bg-red-50 text-status-danger'
                        }`}
                      >
                        {u.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        className="text-xs font-medium text-navy-800 hover:underline"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};
