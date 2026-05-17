// src/pages/CreateCampaignPage.jsx
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import { apiCreateCampaign } from "../api/api";
import "../CSS/CreateCampaignPage.css";

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanTitle = title.trim();
    const cleanTheme = theme.trim();

    if (!cleanTitle) {
      setError(t("createCampaign.titleRequired"));
      return;
    }

    setLoading(true);
    try {
      const created = await apiCreateCampaign(token, {
        title: cleanTitle,
        theme: cleanTheme || null,
      });

      if (created?.id) {
        localStorage.setItem("activeCampaignId", String(created.id));
        navigate(`/campaigns/${created.id}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err?.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-campaign">
      <div className="create-card">
        <h1 className="create-title">{t("createCampaign.title")}</h1>
        <p className="create-subtitle">{t("createCampaign.subtitle")}</p>

        {error && <div className="create-error">{error}</div>}

        <form className="create-form" onSubmit={submit}>
          <label className="create-label">
            {t("createCampaign.titleLabel")}
            <input
              className="create-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("createCampaign.titlePlaceholder")}
              maxLength={255}
              required
              disabled={loading}
            />
          </label>

          <label className="create-label">
            {t("createCampaign.themeLabel")}
            <input
              className="create-input"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={t("createCampaign.themePlaceholder")}
              maxLength={255}
              disabled={loading}
            />
          </label>

          <div className="create-actions">
            <button
              type="button"
              className="create-btn create-btn--ghost"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
            >
              {t("createCampaign.cancel")}
            </button>

            <button type="submit" className="create-btn" disabled={loading}>
              {loading ? t("createCampaign.creating") : t("createCampaign.submit")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}