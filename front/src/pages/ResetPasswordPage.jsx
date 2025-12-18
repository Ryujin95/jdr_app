import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useNotification } from "../context/NotificationContext";

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
        if (!res.ok) {
          throw new Error(data.message || "Token invalide ou expiré.");
        }
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
      if (!res.ok) {
        throw new Error(data.message || "Impossible de modifier le mot de passe.");
      }

      addNotification({ type: "success", message: "Mot de passe mis à jour. Connecte-toi !" });

      setTimeout(() => navigate("/login"), 600);
    } catch (e) {
      addNotification({ type: "error", message: e.message || "Erreur." });
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>Réinitialiser le mot de passe</h1>

      <form onSubmit={submit}>
        <label>Pseudo</label>
        <input
          value={username}
          disabled
          style={{ width: "100%", marginBottom: 12 }}
        />

        <label>Nouveau mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />

        <label>Confirmer</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{ width: "100%", marginBottom: 16 }}
        />

        <button type="submit" style={{ width: "100%" }}>
          Modifier le mot de passe
        </button>
      </form>
    </div>
  );
}
