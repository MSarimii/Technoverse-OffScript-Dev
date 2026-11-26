import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, LogOut, LayoutDashboard, User } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass-nav transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-white">
            Techno<span className="text-blue-400">Verse</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                Dashboard
              </Link>
              <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg shadow-md shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
