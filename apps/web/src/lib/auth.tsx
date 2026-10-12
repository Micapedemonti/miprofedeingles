import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore, type Me } from './api';
import { voicePref } from './speech';

type AuthState = {
  me: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Keep the local voice cache and the account setting in sync; a voice picked before this existed wins once. */
function syncVoice(data: Me) {
  const serverVoice = data.settings?.voice;
  const localVoice = voicePref.get();
  // "alloy" is the API default, i.e. the user never chose a voice on any device.
  const neverChosen = !serverVoice || serverVoice === 'alloy';
  if (neverChosen && localVoice) {
    void api.updateSettings({ voice: localVoice }).catch(() => undefined);
  } else {
    voicePref.set(serverVoice ?? null);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    setMe(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      const data = await api.me();
      syncVoice(data);
      setMe(data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    void refresh();
  }, [logout, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken } = await api.login(email, password);
    tokenStore.set(accessToken);
    const data = await api.me();
    syncVoice(data);
    setMe(data);
  }, []);

  return <AuthContext.Provider value={{ me, loading, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
