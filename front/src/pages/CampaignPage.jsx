// src/pages/CampaignPage.jsx
import { NavLink, Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import "../CSS/CampaignPage.css";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import TrashPanel from "../components/TrashPanel";
import { apiGetCampaignMembers, apiTransferCampaignMj } from "../api/api";

export default function CampaignPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [campaign, setCampaign] = useState(() => state?.campaign ?? null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- transfert MJ (UI)
  const [transferOpen, setTransferOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    if (state?.campaign) {
      setCampaign(state.campaign);
    }
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
        headers: { Authorization: `Bearer ${token}` },
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

  const openTransfer = useCallback(async () => {
    if (!token || !id) return;
    if (!isMjInThisCampaign) return;

    setTransferOpen(true);
    setMembersError("");
    setMembers([]);
    setSelectedUserId("");
    setMembersLoading(true);

    try {
      const list = await apiGetCampaignMembers(token, id);

      const cleaned = Array.isArray(list) ? list : [];
      const candidates = cleaned.filter((m) => {
        const uid = String(m?.id ?? m?.userId ?? "");
        if (!uid) return false;
        if (String(user?.id) && uid === String(user.id)) return false;
        if (String(m?.role || "").toLowerCase() === "mj") return false;
        return true;
      });

      setMembers(candidates);

      if (candidates.length > 0) {
        const firstId = String(candidates[0].id ?? candidates[0].userId);
        setSelectedUserId(firstId);
      } else {
        setMembersError("Aucun joueur disponible. Il faut au moins 1 Player dans la campagne.");
      }
    } catch (e) {
      setMembersError(String(e?.message || "Impossible de charger les membres."));
    } finally {
      setMembersLoading(false);
    }
  }, [token, id, isMjInThisCampaign, user?.id]);

  const closeTransfer = useCallback(() => {
    if (transferLoading) return;
    setTransferOpen(false);
  }, [transferLoading]);

  const confirmTransfer = useCallback(async () => {
    if (!token || !id) return;
    if (!isMjInThisCampaign) return;
    if (!selectedUserId) return;
    if (transferLoading) return;

    const chosen = members.find((m) => String(m?.id ?? m?.userId) === String(selectedUserId));
    const chosenName = chosen?.username || chosen?.name || chosen?.email || "ce joueur";

    const ok = window.confirm(
      `Tu es sûr de vouloir transférer le rôle MJ à ${chosenName} ?\nTu deviendras Player.`
    );
    if (!ok) return;

    setTransferLoading(true);
    try {
      await apiTransferCampaignMj(token, id, Number(selectedUserId));

      setCampaign((prev) => ({
        ...(prev || {}),
        role: "Player",
      }));

      setTransferOpen(false);
      alert("Rôle MJ transféré.");
    } catch (e) {
      alert(String(e?.message || "Impossible de transférer le rôle MJ."));
    } finally {
      setTransferLoading(false);
    }
  }, [token, id, isMjInThisCampaign, selectedUserId, members, transferLoading]);

  return (
    <main className="campaign">
      <div className="campaign-head">
        <h1 className="campaign-title">{campaignTitle}</h1>

        <div className="campaign-invite">
          <span className="campaign-invite-label">Code de la partie</span>
          <code className="campaign-invite-code">{joinCode}</code>
        </div>
      </div>

      <div className="campaign-delete-button-container">
        {isMjInThisCampaign && (
          <>
            <button
              className="delete-campaign-button"
              type="button"
              onClick={handleDeleteCampaign}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer la campagne"}
            </button>

            <button
              type="button"
              className="transfer-mj-button"
              onClick={openTransfer}
              disabled={membersLoading || transferLoading}
            >
              Transférer le rôle MJ
            </button>
          </>
        )}
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
            to={`/campaigns/${id}/createMap`}
            className={({ isActive }) => `campaign-tab ${isActive ? "active" : ""}`}
          >
            Ajouter une carte
          </NavLink>
        )}
      </div>

      <section className="campaign-content">
        <Outlet context={{ campaignId: id, isMjInThisCampaign, campaign }} />
      </section>

      <TrashPanel />

      {transferOpen && (
        <div className="modal-overlay" onClick={closeTransfer}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Transférer le rôle MJ</div>

            {membersLoading && <div className="dash-state">Chargement…</div>}

            {!membersLoading && membersError && (
              <div className="create-error" style={{ marginBottom: "12px" }}>
                {membersError}
              </div>
            )}

            {!membersLoading && !membersError && (
              <>
                <div style={{ marginBottom: "10px" }}>
                  Choisis le joueur qui deviendra MJ.
                </div>

                <select
                  className="create-input"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {members.map((m) => {
                    const uid = String(m?.id ?? m?.userId);
                    const label = m?.username || m?.name || m?.email || `User #${uid}`;
                    return (
                      <option key={uid} value={uid}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                <div className="modal-actions" style={{ marginTop: "12px" }}>
                  <button
                    type="button"
                    className="modal-cancel"
                    onClick={closeTransfer}
                    disabled={transferLoading}
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    className="modal-confirm"
                    onClick={confirmTransfer}
                    disabled={transferLoading || !selectedUserId}
                  >
                    {transferLoading ? "Transfert…" : "Transférer"}
                  </button>
                </div>
              </>
            )}

            {!membersLoading && membersError && (
              <div className="modal-actions" style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={closeTransfer}
                  disabled={transferLoading}
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}