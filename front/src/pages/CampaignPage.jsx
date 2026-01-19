// src/pages/CampaignPage.jsx
import { NavLink, Outlet, useParams } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import "../CSS/CampaignPage.css";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

export default function CampaignPage({ onOpenTrash }) {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);

  const [campaign, setCampaign] = useState(null);

  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ROLE_ADMIN");

  useEffect(() => {
    const load = async () => {
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/campaigns`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const list = await res.json();
        const found = Array.isArray(list) ? list.find((c) => String(c.id) === String(id)) : null;
        if (found) setCampaign(found);
      } catch {
        // ignore
      }
    };

    load();
  }, [token, id]);

  const isMjInThisCampaign = useMemo(() => {
    if (isAdmin) return true;
    return campaign?.role === "MJ";
  }, [campaign, isAdmin]);

  useEffect(() => {
    localStorage.setItem("activeCampaignId", String(id));
    localStorage.setItem("activeCampaignRole", isMjInThisCampaign ? "MJ" : "Player");
  }, [id, isMjInThisCampaign]);

  const campaignTitle = campaign?.title ? campaign.title : `Campagne #${id}`;
  const campaignTheme = campaign?.theme ? campaign.theme : null;

  return (
    <main className="campaign">
      <div className="campaign-head">
        <h1 className="campaign-title">{campaignTitle}</h1>
        <div className="campaign-subtitle">
          {campaignTheme ? campaignTheme : "Choisis un onglet pour naviguer dans la partie."}
        </div>

        {isMjInThisCampaign && (
          <button
            type="button"
            className="campaign-trash-btn"
            onClick={onOpenTrash}
          >
            Corbeille
          </button>
        )}
      </div>

      <div className="campaign-tabs">
        <NavLink to={`/campaigns/${id}/wall`} className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`} end>
          Mur
        </NavLink>

        <NavLink to={`/campaigns/${id}/characters`} className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}>
          Personnages
        </NavLink>

        <NavLink to={`/campaigns/${id}/map`} className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}>
          Carte
        </NavLink>
      </div>

      <section className="campaign-content">
        <Outlet context={{ campaignId: id, isMjInThisCampaign, campaign }} />
      </section>
    </main>
  );
}
