// src/pages/LoginPage.jsx
import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import "../CSS/Login.css";

function LoginPage() {
  const { login } = useContext(AuthContext);
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      addNotification({ type: "success", message: t("login.success") });
      navigate("/dashboard");
    } catch (err) {
      const raw = err?.message || "";
      const msg = raw.includes("Invalid credentials")
        ? t("login.invalidCredentials")
        : raw || t("login.error");

      setError(msg);
      addNotification({ type: "error", message: msg });
    }
  };

  return (
    <main className="login-container">
      <h2 className="login-title">{t("login.title")}</h2>

      <form className="login-form" onSubmit={handleLogin}>
        <input
          className="login-input"
          type="email"
          placeholder={t("login.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div className="password-wrapper">
          <input
            className="login-input"
            type={showPassword ? "text" : "password"}
            placeholder={t("login.password")}
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
            title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
            aria-label={t("login.showPassword")}
          >
            {showPassword ? "⚫" : "👁"}
          </span>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="login-actions">
          <Link className="forgot-link" to="/forgot-password">
            {t("login.forgotPassword")}
          </Link>
        </div>

        <button className="login-button" type="submit">
          {t("login.submit")}
        </button>
      </form>

      <p className="login-link">
        {t("login.noAccount")} <Link to="/register">{t("login.createAccount")}</Link>
      </p>
    </main>
  );
}

export default LoginPage;