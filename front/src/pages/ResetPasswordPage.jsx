// src/pages/ResetPasswordPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useNotification } from "../context/NotificationContext";
import "../CSS/Login.css";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const token = useMemo(() => params.get("token") || "", [params]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      addNotification({ type: "error", message: "Token manquant dans le lien." });
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/reset-password-info?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Token invalide ou expiré.");
        setUsername(data.username || "");
      } catch (e) {
        addNotification({ type: "error", message: e.message || "Erreur." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, addNotification]);

  const submit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      addNotification({ type: "error", message: "Mot de passe trop court." });
      return;
    }

    if (password !== confirm) {
      addNotification({ type: "error", message: "Les mots de passe ne correspondent pas." });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Impossible de modifier le mot de passe.");

      addNotification({ type: "success", message: "Mot de passe mis à jour. Connecte-toi !" });
      setTimeout(() => navigate("/login"), 600);
    } catch (e) {
      addNotification({ type: "error", message: e.message || "Erreur." });
    }
  };

  if (loading) return <div className="login-container">Chargement...</div>;

  return (
    <main className="login-container">
      <h2 className="login-title">Réinitialiser le mot de passe</h2>

      <form className="login-form" onSubmit={submit}>
        <label className="login-label">Pseudo</label>
        <input
          className="login-input"
          value={username}
          disabled
        />

        <label className="login-label">Nouveau mot de passe</label>
        <input
          className="login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="login-label">Confirmer</label>
        <input
          className="login-input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button type="submit" className="login-button">
          Modifier le mot de passe
        </button>
      </form>
    </main>
  );
}