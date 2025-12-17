import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => params.get("token") || "", [params]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token manquant dans le lien.");
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setError("");
        const res = await fetch(`${API_URL}/auth/reset-password-info?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Token invalide ou expiré.");
        setUsername(data.username || "");
      } catch (e) {
        setError(e.message || "Erreur.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    if (password.length < 6) {
      setError("Mot de passe trop court.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
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

      setMsg("Mot de passe mis à jour. Tu peux te reconnecter.");
      setTimeout(() => navigate("/login"), 800);
    } catch (e) {
      setError(e.message || "Erreur.");
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Chargement...</div>;

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1>Réinitialiser le mot de passe</h1>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {msg && <p>{msg}</p>}

      {!error && (
        <form onSubmit={submit}>
          <label>Pseudo</label>
          <input value={username} disabled style={{ width: "100%", marginBottom: 12 }} />

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
      )}
    </div>
  );
}
