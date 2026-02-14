// src/pages/CampaignPage.jsx
import { NavLink, Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import "../CSS/CampaignPage.css";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";

export default function CampaignPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [campaign, setCampaign] = useState(() => state?.campaign ?? null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCampaign(state?.campaign ?? null);
  }, [id, state]);

  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ROLE_ADMIN");

  useEffect(() => {
    if (!token || !id) return;

    const controller = new AbortController();

    (async () => {
      try {
        const resShow = await fetch(`${API_URL}/campaigns/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!resShow.ok) return;

        const fromShow = await resShow.json().catch(() => null);
        if (!fromShow?.id) return;

        setCampaign((prev) => ({
          ...(prev || {}),
          ...(fromShow || {}),
          role: prev?.role ?? fromShow?.role ?? null,
        }));
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    })();

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

  const handleDeleteCampaign = async () => {
    if (!token || !id) return;
    if (!isMjInThisCampaign) return;
    if (isDeleting) return;

    const ok = window.confirm("Tu veux vraiment supprimer cette campagne ? Cette action est définitive.");
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/campaigns/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 204 || res.ok) {
        if (String(localStorage.getItem("activeCampaignId")) === String(id)) {
          localStorage.removeItem("activeCampaignId");
          localStorage.removeItem("activeCampaignRole");
        }
        navigate("/dashboard", { replace: true });
        return;
      }

      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Erreur suppression (${res.status})`);
    } catch (e) {
      alert(e?.message || "Impossible de supprimer la campagne.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="campaign">
      <div className="campaign-head">
        <h1 className="campaign-title">{campaignTitle}</h1>

        <div className="campaign-invite">
          <span className="campaign-invite-label">Code de la partie</span>
          <code className="campaign-invite-code">{joinCode}</code>
        </div>

        <button
          className="delete-campaign-button"
          type="button"
          onClick={handleDeleteCampaign}
          disabled={!isMjInThisCampaign || isDeleting}
          title={!isMjInThisCampaign ? "Seul le MJ (ou un admin) peut supprimer cette campagne" : ""}
        >
          {isDeleting ? "Suppression..." : "Supprimer la campagne"}
        </button>
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
