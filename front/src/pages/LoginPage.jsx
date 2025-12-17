// src/pages/LoginPage.jsx
import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../CSS/Login.css";

function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Erreur de connexion");
    }
  };

  return (
    <main className="login-container">
      <h2 className="login-title">Se connecter</h2>

      {error && <p className="login-error">{error}</p>}

      <form className="login-form" onSubmit={handleLogin}>
        <input
          className="login-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div className="password-wrapper">
          <input
            className="login-input"
            type={showPassword ? "text" : "password"}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label="Afficher ou masquer le mot de passe"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="login-actions">
          <Link className="forgot-link" to="/forgot-password">
            Mot de passe oublié ?
          </Link>
        </div>

        <button className="login-button" type="submit">
          Connexion
        </button>
      </form>

      <p className="login-link">
        Pas de compte ? <Link to="/register">Créer un compte</Link>
      </p>
    </main>
  );
}

export default LoginPage;
