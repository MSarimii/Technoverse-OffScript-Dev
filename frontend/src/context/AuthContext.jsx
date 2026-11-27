import { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { setMemoryToken } from '../services/api';

export const AuthContext = createContext(null);

export function getRoleHome(role) {
  switch (role) {
    case 'admin':
      return '/admin/users';
    case 'examiner':
      return '/examiner';
    case 'candidate':
      return '/candidate';
    default:
      return '/';
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const saved = sessionStorage.getItem('sems_token');
    setMemoryToken(saved);
    return saved;
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setMemoryToken(null);
    sessionStorage.removeItem('sems_token');
    localStorage.removeItem('sems_mock_uid');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauth = () => {
      logout();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    };
    window.addEventListener('sems:unauthorized', onUnauth);
    return () => window.removeEventListener('sems:unauthorized', onUnauth);
  }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.data?.user || res.user);
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const receivedToken = res.data?.token || res.token;
    const userData = res.data?.user || res.user;
    setMemoryToken(receivedToken);
    sessionStorage.setItem('sems_token', receivedToken);
    setToken(receivedToken);
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
