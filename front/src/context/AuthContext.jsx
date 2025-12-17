import { createContext, useMemo, useState } from "react";
import { API_URL } from "../config";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("jdr_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("jdr_user");
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/login_check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.message || data?.detail || "Identifiants invalides");
    }

    if (!data?.token) {
      throw new Error("Token manquant");
    }

    const meRes = await fetch(`${API_URL}/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${data.token}`,
      },
    });

    const me = await meRes.json().catch(() => null);

    if (!meRes.ok) {
      throw new Error(me?.error || "Non authentifié");
    }

    localStorage.setItem("jdr_token", data.token);
    localStorage.setItem("jdr_user", JSON.stringify(me));
    setToken(data.token);
    setUser(me);
  };

  const forgotPassword = async (email) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.message || "Erreur lors de la demande");
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem("jdr_token");
    localStorage.removeItem("jdr_user");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      login,
      logout,
      forgotPassword,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
