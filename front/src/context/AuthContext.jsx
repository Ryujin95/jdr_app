// src/context/AuthContext.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";
import { apiListFriends, apiListFriendRequests } from "../api/api";
import { AuthContext } from "./AuthContextObject";

function readStoredAuth() {
  const raw = localStorage.getItem("auth");
  if (!raw) return { token: null, user: null };
  try {
    const parsed = JSON.parse(raw);
    return parsed?.token
      ? { token: parsed.token, user: parsed.user || null }
      : { token: null, user: null };
  } catch (error) {
    console.error("Auth parse error:", error);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [storedAuth] = useState(readStoredAuth);
  const [token, setToken] = useState(storedAuth.token);
  const [user, setUser] = useState(storedAuth.user);
  const [meSyncedOnce, setMeSyncedOnce] = useState(false);

  const fetchMe = useCallback(async (jwt) => {
    const meRes = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (meRes.status === 401) throw new Error("SESSION_EXPIRED");
    if (!meRes.ok) {
      const text = await meRes.text().catch(() => "");
      throw new Error(text || "Impossible de charger /me");
    }
    return meRes.json();
  }, []);

  const prefetchFriends = useCallback(async (jwt) => {
    try {
      await Promise.all([apiListFriends(jwt), apiListFriendRequests(jwt)]);
    } catch (e) {
      console.error("prefetchFriends error:", e);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setMeSyncedOnce(false);
    localStorage.removeItem("auth");
  }, []);

  const saveAuth = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setMeSyncedOnce(true);
    localStorage.setItem("auth", JSON.stringify({ token: nextToken, user: nextUser }));
    prefetchFriends(nextToken);
  }, [prefetchFriends]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/login_check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.token) {
      throw new Error(data?.message || "Invalid credentials");
    }
    const me = await fetchMe(data.token);
    saveAuth(data.token, me);
  }, [fetchMe, saveAuth]);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...partial };
      localStorage.setItem("auth", JSON.stringify({ token, user: next }));
      return next;
    });
  }, [token]);

  useEffect(() => {
    if (!token || meSyncedOnce) return;
    let cancelled = false;
    const syncMe = async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;
        setUser(me);
        localStorage.setItem("auth", JSON.stringify({ token, user: me }));
        setMeSyncedOnce(true);
        await prefetchFriends(token);
      } catch (e) {
        if (e?.message === "SESSION_EXPIRED") logout();
      }
    };
    syncMe();
    return () => { cancelled = true; };
  }, [token, meSyncedOnce, fetchMe, prefetchFriends, logout]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const pingPresence = async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;
        setUser((prev) => {
          const next = prev ? { ...prev, ...me } : me;
          localStorage.setItem("auth", JSON.stringify({ token, user: next }));
          return next;
        });
      } catch (e) {
        if (e?.message === "SESSION_EXPIRED") logout();
      }
    };
    const interval = setInterval(pingPresence, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, fetchMe, logout]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  }), [token, user, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
