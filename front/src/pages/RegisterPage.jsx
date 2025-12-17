// src/pages/RegisterPage.jsx
import { useState } from "react";
import "../CSS/Register.css";
import { API_URL } from "../config";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [createResult, setCreateResult] = useState(null);
  const [error, setError] = useState(null);

  const createUser = async (e) => {
    e.preventDefault();
    setError(null);
    setCreateResult(null);

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de la création du compte");
        return;
      }

      setCreateResult(data);
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError("Erreur réseau");
    }
  };

  return (
    <main className="register-container">
      <h2 className="register-title">Créer un compte</h2>

      {error && <p className="register-error">{error}</p>}

      <form className="register-form" onSubmit={createUser}>
        <input
          type="text"
          className="register-input"
          placeholder="Nom d'utilisateur"
          value={username}
          required
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          className="register-input"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            className="register-input"
            placeholder="Mot de passe"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />

          <span
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? "🙈" : "👁"}
          </span>
        </div>

        <button className="register-button" type="submit">
          Créer le compte
        </button>
      </form>

      {createResult && (
        <div className="register-success">
          <p>Compte créé avec succès</p>
        </div>
      )}
    </main>
  );
}

export default RegisterPage;
