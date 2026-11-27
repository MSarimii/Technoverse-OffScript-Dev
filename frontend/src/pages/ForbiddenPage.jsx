import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getRoleHome } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ForbiddenPage = () => {
  const { user } = useAuth();
  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-50 text-status-danger flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-6 h-6" aria-hidden="true" />
      </div>
      <p className="font-mono text-xs text-ink-muted mb-2">403 · FORBIDDEN</p>
      <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-[-0.03em] text-ink mb-3">Access Denied</h1>
      <p className="text-sm text-ink-muted mb-6">
        Your account ({user?.role || 'guest'}) does not have permission to view this resource. Permissions are enforced on the server.
      </p>
      <Link
        to={user ? getRoleHome(user.role) : '/login'}
        className="inline-flex items-center justify-center min-h-[44px] bg-cobalt hover:bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
      >
        Return to your workspace
      </Link>
    </main>
  );
};
