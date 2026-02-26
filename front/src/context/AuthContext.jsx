// src/context/AuthContext.jsx
import { createContext, useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";
import {
  apiListFriends,
  apiListFriendRequests
} from "../api/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [meSyncedOnce, setMeSyncedOnce] = useState(false);

  // 🔥 NOUVEAU : préchargement amis
  const prefetchFriends = async (jwt) => {
    try {
      await Promise.all([
        apiListFriends(jwt),
        apiListFriendRequests(jwt),
      ]);
    } catch {
      // silencieux volontairement
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("auth");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        setToken(parsed.token);
        setUser(parsed.user || null);
        setMeSyncedOnce(!!parsed.user);

        // 🔥 NOUVEAU : précharge amis au reload
        if (parsed.token) {
          prefetchFriends(parsed.token);
        }
      }
    } catch {}
  }, []);

  const fetchMe = async (jwt) => {
    const meRes = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (meRes.status === 401) {
      throw new Error("SESSION_EXPIRED");
    }

    if (!meRes.ok) {
      const text = await meRes.text().catch(() => "");
      throw new Error(text || "Impossible de charger /me");
    }

    return meRes.json();
  };

  useEffect(() => {
    if (!token) return;
    if (meSyncedOnce) return;

    let cancelled = false;

    const syncMe = async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;

        setUser(me);
        localStorage.setItem("auth", JSON.stringify({ token, user: me }));
        setMeSyncedOnce(true);

        // 🔥 NOUVEAU : précharge amis après sync
        await prefetchFriends(token);

      } catch (e) {
        if (e?.message === "SESSION_EXPIRED") {
          setToken(null);
          setUser(null);
          localStorage.removeItem("auth");
        }
      }
    };

    syncMe();

    return () => {
      cancelled = true;
    };
  }, [token, meSyncedOnce]);

  const saveAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setMeSyncedOnce(true);
    localStorage.setItem("auth", JSON.stringify({ token: nextToken, user: nextUser }));

    // 🔥 NOUVEAU : précharge amis après login
    prefetchFriends(nextToken);
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/login_check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.token) {
      throw new Error(data?.message || "Invalid credentials");
    }

    const jwt = data.token;
    const me = await fetchMe(jwt);

    saveAuth(jwt, me);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMeSyncedOnce(false);
    localStorage.removeItem("auth");
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      const base = prev || {};
      const next = { ...base, ...partial };
      localStorage.setItem("auth", JSON.stringify({ token, user: next }));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      updateUser,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}