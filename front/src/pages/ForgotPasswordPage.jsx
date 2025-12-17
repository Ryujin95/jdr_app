// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../CSS/Login.css";
import { API_URL } from "../config";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [error, setError] = useState("");

  // Si API_URL finit par /api, on l'enlève pour appeler /auth/...
  const BASE_URL = API_URL.replace(/\/api\/?$/, "");

  const handleSend = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.detail || "Impossible d’envoyer le mail");
      }

      setOk("Si l’email existe, un lien de réinitialisation a été envoyé.");
      setEmail("");
    } catch (err) {
      setError(err.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <h2 className="login-title">Mot de passe oublié</h2>

      {error && <p className="login-error">{error}</p>}
      {ok && <p className="login-success">{ok}</p>}

      <form className="login-form" onSubmit={handleSend}>
        <input
          className="login-input"
          type="email"
          placeholder="Ton email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

      <p className="login-link">
        <Link to="/login">Retour connexion</Link>
      </p>
    </main>
  );
}

export default ForgotPasswordPage;
