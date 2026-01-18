// front/src/pages/LoginPage.jsx
import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import "../CSS/Login.css";

function LoginPage() {
  const { login } = useContext(AuthContext);
  const { addNotification } = useNotification();
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

      addNotification({
        type: "success",
        message: "Connexion réussie, bienvenue !",
      });

      // ✅ redirection vers le dashboard après connexion
      navigate("/dashboard");
    } catch (err) {
      const raw = err?.message || "";
      let msg = raw || "Erreur de connexion";

      if (raw.includes("Invalid credentials")) {
        msg = "Email ou mot de passe incorrect.";
      }

      setError(msg);

      addNotification({
        type: "error",
        message: msg,
      });
    }
  };

  return (
    <main className="login-container">
      <h2 className="login-title">Se connecter</h2>

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
            title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-label="Afficher ou masquer le mot de passe"
          >
            {showPassword ? "⚫" : "👁"}
          </span>
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
