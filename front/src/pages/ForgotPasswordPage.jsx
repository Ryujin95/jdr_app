// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useNotification } from "../context/NotificationContext";
import { API_URL } from "../config";
import "../CSS/Login.css";

function ForgotPasswordPage() {
  const { addNotification } = useNotification();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const BASE_URL = API_URL.replace(/\/api\/?$/, "");

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.detail || t("common.error"));

      addNotification({ type: "success", message: t("forgotPassword.success") });
      setEmail("");
    } catch (err) {
      addNotification({ type: "error", message: err.message || t("register.networkError") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <h2 className="login-title">{t("forgotPassword.title")}</h2>

      <form className="login-form" onSubmit={handleSend}>
        <input
          className="login-input"
          type="email"
          placeholder={t("forgotPassword.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? t("forgotPassword.sending") : t("forgotPassword.submit")}
        </button>
      </form>

      <p className="login-link">
        <Link to="/login">{t("forgotPassword.backToLogin")}</Link>
      </p>
    </main>
  );
}

export default ForgotPasswordPage;