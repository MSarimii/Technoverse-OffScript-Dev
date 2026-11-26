import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('technoverse_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.data?.user || res.user);
        } catch (err) {
          console.warn('Auth token expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const receivedToken = res.token;
    const userData = res.data?.user || res.user;

    localStorage.setItem('technoverse_token', receivedToken);
    setToken(receivedToken);
    setUser(userData);
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authService.register(name, email, password);
    const receivedToken = res.token;
    const userData = res.data?.user || res.user;

    localStorage.setItem('technoverse_token', receivedToken);
    setToken(receivedToken);
    setUser(userData);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('technoverse_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
