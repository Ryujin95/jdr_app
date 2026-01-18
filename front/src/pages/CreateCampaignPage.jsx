// src/pages/CreateCampaignPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import "../CSS/CreateCampaignPage.css";

export default function CreateCampaignPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("Zombies");
  const [theme, setTheme] = useState("Survie");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const headers = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

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
      const res = await fetch(`${API_URL}/campaigns`, {
        method: "POST",
        headers,
        body: JSON.stringify({ title: cleanTitle, theme: cleanTheme || null }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Impossible de créer la campagne");
      }

      const created = await res.json();

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
        <p className="create-subtitle">
          Tu deviens MJ automatiquement. Les invités seront joueurs.
        </p>

        {error && <div className="create-error">{error}</div>}

        <form className="create-form" onSubmit={submit}>
          <label className="create-label">
            Titre du JDR
            <input
              className="create-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Zombies"
              maxLength={255}
              required
            />
          </label>

          <label className="create-label">
            Thème
            <input
              className="create-input"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Survie, Fantasy, Cyberpunk…"
              maxLength={255}
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
