// src/pages/ResetPasswordPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_URL } from "../config";
import { useNotification } from "../context/NotificationContext";
import "../CSS/Login.css";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { t } = useTranslation();

  const token = useMemo(() => params.get("token") || "", [params]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      addNotification({ type: "error", message: t("resetPassword.missingToken") });
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/reset-password-info?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || t("resetPassword.invalidToken"));
        setUsername(data.username || "");
      } catch (e) {
        addNotification({ type: "error", message: e.message || t("common.error") });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, addNotification, t]);

  const submit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      addNotification({ type: "error", message: t("resetPassword.tooShort") });
      return;
    }

    if (password !== confirm) {
      addNotification({ type: "error", message: t("resetPassword.mismatch") });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t("common.error"));

      addNotification({ type: "success", message: t("resetPassword.success") });
      setTimeout(() => navigate("/login"), 600);
    } catch (e) {
      addNotification({ type: "error", message: e.message || t("common.error") });
    }
  };

  if (loading) return <div className="login-container">{t("resetPassword.loading")}</div>;

  return (
    <main className="login-container">
      <h2 className="login-title">{t("resetPassword.title")}</h2>

      <form className="login-form" onSubmit={submit}>
        <label className="login-label">{t("resetPassword.username")}</label>
        <input
          className="login-input"
          value={username}
          disabled
        />

        <label className="login-label">{t("resetPassword.newPassword")}</label>
        <input
          className="login-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <label className="login-label">{t("resetPassword.confirm")}</label>
        <input
          className="login-input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button type="submit" className="login-button">
          {t("resetPassword.submit")}
        </button>
      </form>
    </main>
  );
}