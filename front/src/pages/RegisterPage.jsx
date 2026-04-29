// src/pages/RegisterPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import "../CSS/Register.css";
import { API_URL } from "../config";

function RegisterPage() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        addNotification({ type: "error", message: data.error || "Impossible de créer le compte" });
        return;
      }

      addNotification({ type: "success", message: "Compte créé avec succès !" });
      setForm({ username: "", email: "", password: "" });
      navigate("/login");

    } catch {
      addNotification({ type: "error", message: "Erreur réseau" });
    }
  };

  return (
    <main className="register-container">
      <h2 className="register-title">Créer un compte</h2>

      <form className="register-form" onSubmit={submit}>
        <input
          type="text"
          name="username"
          className="register-input"
          placeholder="Nom d'utilisateur"
          value={form.username}
          onChange={updateField}
          required
        />

        <input
          type="email"
          name="email"
          className="register-input"
          placeholder="Email"
          value={form.email}
          onChange={updateField}
          required
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            className="register-input"
            placeholder="Mot de passe"
            value={form.password}
            onChange={updateField}
            required
          />

          <span
            role="button"
            tabIndex={0}
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowPassword((v) => !v);
              }
            }}
            aria-label="Afficher ou masquer le mot de passe"
          >
            {showPassword ? "⚫" : "👁"}
          </span>
        </div>

        <button type="submit" className="register-button">Créer le compte</button>
      </form>

      <p className="register-link">
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </p>
    </main>
  );
}

export default RegisterPage;