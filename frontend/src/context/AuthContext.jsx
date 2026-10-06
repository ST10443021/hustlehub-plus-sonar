import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
const AuthContext = createContext(null);
const TOKEN_KEY = 'hustlehub_token';
const USER_KEY = 'hustlehub_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null); setExpiresAt(null);
    setSessionError('');
  }, []);
  const refreshSession = useCallback(async () => {
    setInitialising(true);
    setSessionError('');
    const requestedToken = localStorage.getItem(TOKEN_KEY);
    if (!requestedToken) {
      logout(); setInitialising(false); return;
    }
    try {
      const res = await apiClient.get('/auth/profile');
      if (localStorage.getItem(TOKEN_KEY) !== requestedToken) return;
      setUser(res.data.data.user);
      setExpiresAt(res.data.data.expiresAt || null);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.data.user));
    } catch (err) {
      setUser(null);
      if (err.response?.status === 401) logout();
      else setSessionError(getErrorMessage(err));
    } finally { setInitialising(false); }
  }, [logout]);
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('hustlehub:unauthorized', onUnauthorized);
    refreshSession();
    return () => window.removeEventListener('hustlehub:unauthorized', onUnauthorized);
  }, [logout, refreshSession]);
  useEffect(() => {
    if (!expiresAt || !user) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) { logout(); return; }
    const timer = window.setTimeout(logout, Math.min(remaining, 2147483647));
    return () => window.clearTimeout(timer);
  }, [expiresAt, user, logout]);
  const register = useCallback(async (form) => {
    setLoading(true);
    try { await apiClient.post('/auth/register', form); }
    catch (err) { throw new Error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  const login = useCallback(async (form) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', form);
      const { token, user: loggedInUser } = res.data.data;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser); setExpiresAt(res.data.data.expiresAt || null); setSessionError('');
      return loggedInUser;
    } catch (err) { throw new Error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), loading, initialising, sessionError, refreshSession, register, login, logout }),
    [user, loading, initialising, sessionError, refreshSession, register, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
