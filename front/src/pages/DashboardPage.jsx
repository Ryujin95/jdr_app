// src/pages/DashboardPage.jsx
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/DashboardPage.css";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const authHeaders = useMemo(() => {
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

    // ✅ MODIF: on passe la campagne en state pour que CampaignPage ait le role tout de suite
    // ✅ MODIF: on va direct sur /wall (comme ton App.jsx redirect index -> wall, mais là c'est direct)
    navigate(`/campaigns/${c.id}/wall`, { state: { campaign: c } });
  };

  const openJoin = () => {
    setJoinError("");
    setJoinCode("");
    setJoinOpen(true);
  };

  const closeJoin = () => {
    if (joinLoading) return;
    setJoinOpen(false);
  };

  const submitJoin = async (e) => {
    e.preventDefault();
    setJoinError("");

    const code = String(joinCode || "").trim().toUpperCase();
    if (!code) {
      setJoinError("Entre un code.");
      return;
    }

    setJoinLoading(true);
    try {
      const res = await fetch(`${API_URL}/campaigns/join`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => null);

      const campaignId = data?.campaignId ?? data?.id ?? data?.campaign?.id ?? null;

      if (!campaignId) {
        await fetchCampaigns();
        setJoinOpen(false);
        return;
      }

      localStorage.setItem("activeCampaignId", String(campaignId));
      setJoinOpen(false);

      // ✅ MODIF: on passe ce que le back renvoie (souvent title/theme/joinCode) en state
      // et surtout si le back renvoie "role", CampaignPage l'a direct.
      // Si le back ne renvoie pas role ici, CampaignPage restera instantané uniquement quand on vient du dashboard list.
      navigate(`/campaigns/${campaignId}/wall`, { state: { campaign: data } });
    } catch (err) {
      const msg = String(err?.message || "Impossible de rejoindre la campagne.");

      if (msg.includes("<!DOCTYPE") || msg.includes("No route found")) {
        setJoinError("Route join inexistante côté backend (POST /api/campaigns/join).");
      } else if (msg.includes("JWT") || msg.includes("Unauthorized") || msg.includes("401")) {
        setJoinError("Token invalide ou expiré. Reconnecte-toi.");
      } else {
        setJoinError(msg);
      }
    } finally {
      setJoinLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="dash">
        <h1 className="dash-title">Mes JDR</h1>
        <div className="dash-state">Connecte-toi pour créer ou rejoindre un JDR.</div>
        <button className="dash-create" onClick={() => navigate("/login")}>
          Se connecter
        </button>
      </main>
    );
  }

  return (
    <main className="dash">
      <h1 className="dash-title">Mes JDR</h1>

      {loading && <div className="dash-state">Chargement…</div>}

      {!loading && (
        <section className="grid">
          <article
            className="card card-create"
            onClick={() => navigate("/campaigns/create")}
            role="button"
            tabIndex={0}
          >
            <div className="card-top">
              <span className="tag">Créer</span>
              <span className="role role-mj">MJ</span>
            </div>
            <div className="card-title">Créer un JDR</div>
            <div className="card-meta">Titre + thème, tu deviens MJ.</div>
            <div className="card-action">Créer</div>
          </article>

          <article className="card card-join" onClick={openJoin} role="button" tabIndex={0}>
            <div className="card-top">
              <span className="tag">Code</span>
              <span className="role role-player">Player</span>
            </div>
            <div className="card-title">Rejoindre un JDR</div>
            <div className="card-meta">Entre un code (ex: 75J867).</div>
            <div className="card-action">Rejoindre</div>
          </article>

          {campaigns.map((c) => (
            <article key={c.id} className="card" onClick={() => openCampaign(c)} role="button" tabIndex={0}>
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

      {joinOpen && (
        <div className="modal-overlay" onClick={closeJoin}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Rejoindre un JDR</div>

            {joinError && (
              <div className="create-error" style={{ marginBottom: "12px" }}>
                {joinError}
              </div>
            )}

            <form onSubmit={submitJoin}>
              <input
                className="create-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Code de campagne (ex: 75J867)"
                maxLength={12}
                autoFocus
              />

              <div className="modal-actions" style={{ marginTop: "12px" }}>
                <button type="button" className="modal-cancel" onClick={closeJoin} disabled={joinLoading}>
                  Annuler
                </button>

                <button type="submit" className="modal-confirm" disabled={joinLoading}>
                  {joinLoading ? "Connexion…" : "Rejoindre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
