// src/context/AuthContext.jsx
import { createContext, useEffect, useState } from "react";
import { API_URL } from "../config";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // lecture du localStorage au démarrage
  useEffect(() => {
    const raw = localStorage.getItem("auth");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.token) {
        setToken(parsed.token);
        setUser(parsed.user || null);
      }
    } catch {}
  }, []);

  // ✅ NOUVEAU : si on a un token, on recharge /me pour avoir les champs à jour (ex: disableTransitions)
  useEffect(() => {
    if (!token) return;

    const syncMe = async () => {
      try {
        const meRes = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!meRes.ok) return;

        const me = await meRes.json();
        setUser(me);
        localStorage.setItem("auth", JSON.stringify({ token, user: me }));
      } catch {}
    };

    syncMe();
  }, [token]);

  const saveAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(
      "auth",
      JSON.stringify({ token: nextToken, user: nextUser })
    );
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/login_check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data.message || "Invalid credentials");
    }

    const jwt = data.token;

    const meRes = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const me = await meRes.json();
    if (!meRes.ok) {
      throw new Error("Impossible de charger le profil");
    }

    saveAuth(jwt, me);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth");
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("auth", JSON.stringify({ token, user: next }));
      return next;
    });
  };

  const value = {
    token,
    user,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
