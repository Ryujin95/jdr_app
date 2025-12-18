// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../CSS/Login.css";
import { API_URL } from "../config";
import { useNotification } from "../context/NotificationContext";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { addNotification } = useNotification();

  const BASE_URL = API_URL.replace(/\/api\/?$/, "");

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.detail || "Erreur d’envoi");
      }

      addNotification({
        type: "success",
        message: "Si l’email existe, tu recevras un lien.",
      });

      setEmail("");
    } catch (err) {
      addNotification({
        type: "error",
        message: err.message || "Erreur réseau",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <h2 className="login-title">Mot de passe oublié</h2>

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
