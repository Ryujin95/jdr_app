// src/pages/CampaignPage.jsx
import { NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import "../CSS/CampaignPage.css";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

export default function CampaignPage() {
  const { id } = useParams();
  const { state } = useLocation(); // ✅ MODIF
  const { token, user } = useContext(AuthContext);

  // ✅ MODIF: on initialise avec la campagne passée depuis Dashboard (zéro décalage onglet Éditeur)
  const [campaign, setCampaign] = useState(() => state?.campaign ?? null);

  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ROLE_ADMIN");

  useEffect(() => {
    if (!token || !id) return;

    const controller = new AbortController();
    const { signal } = controller;

    const load = async () => {
      try {
        // ✅ MODIF: ici on n'a plus besoin de /campaigns pour connaitre le rôle si on vient du Dashboard
        // On garde juste le show pour joinCode + infos à jour.
        const resShow = await fetch(`${API_URL}/campaigns/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (!resShow.ok) return;

        const fromShow = await resShow.json().catch(() => null);
        if (!fromShow || !fromShow.id) return;

        // ✅ MODIF: on garde le role déjà connu (state) si le show ne le renvoie pas
        setCampaign((prev) => ({
          ...(prev || {}),
          ...(fromShow || {}),
          role: prev?.role ?? fromShow?.role ?? null,
        }));
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    };

    load();
    return () => controller.abort();
  }, [token, id]);

  const isMjInThisCampaign = useMemo(() => {
    if (isAdmin) return true;
    return campaign?.role === "MJ";
  }, [campaign, isAdmin]);

  useEffect(() => {
    if (!id) return;
    localStorage.setItem("activeCampaignId", String(id));
    localStorage.setItem("activeCampaignRole", isMjInThisCampaign ? "MJ" : "Player");
  }, [id, isMjInThisCampaign]);

  const campaignTitle = campaign?.title ?? `Campagne #${id}`;
  const joinCode =
    campaign?.joinCode && String(campaign.joinCode).trim() !== "" ? String(campaign.joinCode) : "—";

  return (
    <main className="campaign">
      <div className="campaign-head">
        <h1 className="campaign-title">{campaignTitle}</h1>

        <div className="campaign-invite">
          <span className="campaign-invite-label">Code de la partie</span>
          <code className="campaign-invite-code">{joinCode}</code>
        </div>
      </div>

      <div className="campaign-tabs">
        <NavLink
          to={`/campaigns/${id}/wall`}
          className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}
          end
        >
          Mur
        </NavLink>

        <NavLink
          to={`/campaigns/${id}/characters`}
          className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}
        >
          Personnages
        </NavLink>

        <NavLink
          to={`/campaigns/${id}/map`}
          className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}
        >
          Carte
        </NavLink>

        {isMjInThisCampaign && (
          <NavLink
            to={`/campaigns/${id}/editor`}
            className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}
          >
            Éditeur
          </NavLink>
        )}
      </div>

      <section className="campaign-content">
        <Outlet context={{ campaignId: id, isMjInThisCampaign, campaign }} />
      </section>
    </main>
  );
}
