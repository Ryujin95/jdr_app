// src/pages/DashboardPage.jsx
import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/DashboardPage.css";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // si pas prêt / pas autorisé => on affiche juste la carte "Créer un JDR"
      if (!res.ok) {
        setCampaigns([]);
        return;
      }

      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchCampaigns();
    else {
      setCampaigns([]);
      setLoading(false);
    }
  }, [token, fetchCampaigns]);

  const openCampaign = (c) => {
    localStorage.setItem("activeCampaignId", String(c.id));
    
    navigate(`/campaigns/${c.id}`);
  };

  if (!token) {
    return (
      <main className="dash">
        <h1 className="dash-title">Mes JDR</h1>
        <div className="dash-state">Connecte-toi pour créer ou voir tes JDR.</div>
        <button className="dash-create" onClick={() => navigate("/login")}>
          Se connecter
        </button>
      </main>
    );
  }

  const showOnlyCreateCard = !loading && campaigns.length === 0;

  return (
    <main className="dash">
      <h1 className="dash-title">Mes JDR</h1>

      {loading && <div className="dash-state">Chargement…</div>}

      {showOnlyCreateCard && (
        <section className="empty">
          <div className="empty-card">
            <div className="empty-title">Créer un JDR</div>
            <div className="empty-text">
              Crée ta campagne “Zombies” (ou n’importe quel thème). Tu seras MJ automatiquement, et les invités seront joueurs.
            </div>
            <button className="dash-create" onClick={() => navigate("/campaigns/create")}>
              Créer un JDR
            </button>
          </div>
        </section>
      )}

      {!loading && campaigns.length > 0 && (
        <section className="grid">
          {campaigns.map((c) => (
            <article
              key={c.id}
              className="card"
              onClick={() => openCampaign(c)}
              role="button"
              tabIndex={0}
            >
              <div className="card-top">
                <span className="tag">{c.theme || "Thème libre"}</span>
                <span className={`role ${c.role === "MJ" ? "role-mj" : "role-player"}`}>
                  {c.role || "Player"}
                </span>
              </div>

              <div className="card-title">{c.title}</div>

              <div className="card-meta">
                Dernière activité: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}
              </div>

              <div className="card-action">Ouvrir</div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
