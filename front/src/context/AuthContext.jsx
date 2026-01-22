// src/context/AuthContext.jsx
import { createContext, useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // ✅ MODIF: évite double fetch /me (login + sync) juste après le login
  const [meSyncedOnce, setMeSyncedOnce] = useState(false);

  // lecture du localStorage au démarrage
  useEffect(() => {
    const raw = localStorage.getItem("auth");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.token) {
        setToken(parsed.token);
        setUser(parsed.user || null);
        // ✅ MODIF: si on a déjà un user en cache, on considère qu'on a "déjà sync"
        setMeSyncedOnce(!!parsed.user);
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ MODIF: helper pour charger /me proprement
  const fetchMe = async (jwt) => {
    const meRes = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    // ✅ MODIF: si token invalide/expiré, on nettoie
    if (meRes.status === 401) {
      throw new Error("SESSION_EXPIRED");
    }

    if (!meRes.ok) {
      const text = await meRes.text().catch(() => "");
      throw new Error(text || "Impossible de charger /me");
    }

    return meRes.json();
  };

  // ✅ MODIF: sync /me une seule fois quand on a un token (ex: refresh après reload)
  useEffect(() => {
    if (!token) return;
    if (meSyncedOnce) return; // ✅ MODIF: évite de resync inutilement

    let cancelled = false;

    const syncMe = async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;

        setUser(me);
        localStorage.setItem("auth", JSON.stringify({ token, user: me }));
        setMeSyncedOnce(true); // ✅ MODIF
      } catch (e) {
        if (e?.message === "SESSION_EXPIRED") {
          // ✅ MODIF: logout auto si token mort
          setToken(null);
          setUser(null);
          localStorage.removeItem("auth");
        }
        // sinon on ignore comme avant
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
    setMeSyncedOnce(true); // ✅ MODIF: on vient de récupérer /me, inutile de resync derrière
    localStorage.setItem("auth", JSON.stringify({ token: nextToken, user: nextUser }));
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

    // ✅ MODIF: on passe par le helper fetchMe + gestion d’erreurs
    const me = await fetchMe(jwt);

    saveAuth(jwt, me);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMeSyncedOnce(false); // ✅ MODIF
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

  // ✅ MODIF: évite recalcul et rend le contexte un peu plus stable
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
