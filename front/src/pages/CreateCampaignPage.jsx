// src/pages/CreateCampaignPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCreateCampaign } from "../api/api";
import "../CSS/CreateCampaignPage.css";

function getTokenFromStorage() {
  const direct = localStorage.getItem("token");
  if (direct) return direct;

  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export default function CreateCampaignPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("Zombies");
  const [theme, setTheme] = useState("Survie");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = getTokenFromStorage();

  const submit = async (e) => {
  e.preventDefault();
  setError("");

  const cleanTitle = title.trim();
  const cleanTheme = theme.trim();

  if (!cleanTitle) {
    setError("Le titre est obligatoire.");
    return;
  }

  setLoading(true);
  try {
    const payload = {
      title: cleanTitle,
      theme: cleanTheme || null,
    };

    const created = await apiCreateCampaign(token, payload);

    if (created?.id) {
      localStorage.setItem("activeCampaignId", String(created.id));
      navigate(`/campaigns/${created.id}`);
    } else {
      navigate("/dashboard");
    }
  } catch (e2) {
    setError(e2?.message || "Erreur");
  } finally {
    setLoading(false);
  }
};


  return (
    <main className="create-campaign">
      <div className="create-card">
        <h1 className="create-title">Créer une campagne</h1>
        <p className="create-subtitle">Tu deviens MJ automatiquement.</p>

        {error && <div className="create-error">{error}</div>}

        <form className="create-form" onSubmit={submit}>
          <label className="create-label">
            Titre du JDR
            <input
              className="create-input"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Zombies"
              maxLength={255}
              required
              disabled={loading}
            />
          </label>

          <label className="create-label">
            Thème
            <input
              className="create-input"
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Survie, Fantasy, Cyberpunk…"
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
              Retour
            </button>

            <button className="create-btn" type="submit" disabled={loading}>
              {loading ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
