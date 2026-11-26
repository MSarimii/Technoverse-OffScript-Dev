import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Terminal, Shield, ArrowUpRight, Database, Server } from 'lucide-react';

export const DashboardPage = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Profile Greeting */}
      <div className="glass-panel p-8 rounded-3xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">
            Authenticated Workspace
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            You are operating on the decoupled TechnoVerse MERN platform. Backend and Frontend contracts are active.
          </p>
        </div>
      </div>

      {/* Grid of Status & Protocol Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-3 font-semibold uppercase">
              <span>Auth Session</span>
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-white">Active Token</div>
            <p className="text-xs text-slate-400 mt-1">
              Signed with JWT & verified through protected endpoint.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            Role: {user?.role || 'user'}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-3 font-semibold uppercase">
              <span>Frontend Contract</span>
              <Terminal className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-sm font-semibold text-white">Vite React SPA</div>
            <p className="text-xs text-slate-400 mt-1">
              Consuming backend API via Axios request/response interceptors.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-400">
            <span>Independent Mode</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs mb-3 font-semibold uppercase">
              <span>Backend Contract</span>
              <Server className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-sm font-semibold text-white">Express + Mongoose</div>
            <p className="text-xs text-slate-400 mt-1">
              Modular controllers, salted bcrypt hashing, and rate limiting.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-indigo-400">
            <Database className="w-4 h-4" />
            Zip Handoff Ready
          </div>
        </div>
      </div>
    </div>
  );
};
