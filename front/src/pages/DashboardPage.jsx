// src/pages/DashboardPage.jsx
import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../CSS/DashboardPage.css";
import { AuthContext } from "../context/AuthContext";
import { apiListCampaigns, apiJoinCampaign, apiLeaveCampaign } from "../api/api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const { t } = useTranslation();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiListCampaigns(token);
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
    if (!c?.id) return;
    localStorage.setItem("activeCampaignId", String(c.id));
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
      setJoinError(t("dashboard.joinModal.enterCode"));
      return;
    }

    setJoinLoading(true);
    try {
      const data = await apiJoinCampaign(token, code);
      const campaignId = data?.campaignId ?? data?.id ?? data?.campaign?.id ?? null;

      if (!campaignId) {
        await fetchCampaigns();
        setJoinOpen(false);
        return;
      }

      localStorage.setItem("activeCampaignId", String(campaignId));
      setJoinOpen(false);
      navigate(`/campaigns/${campaignId}/wall`, { state: { campaign: data } });
    } catch (err) {
      const msg = String(err?.message || t("dashboard.joinModal.error"));

      if (msg.includes("<!DOCTYPE") || msg.includes("No route found")) {
        setJoinError("Route join inexistante côté backend.");
      } else if (msg.includes("JWT") || msg.includes("Unauthorized") || msg.includes("401")) {
        setJoinError("Token invalide ou expiré. Reconnecte-toi.");
      } else {
        setJoinError(msg);
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const leaveCampaign = useCallback(async (campaignId) => {
    if (!window.confirm(t("dashboard.leaveConfirm"))) return;
    try {
      await apiLeaveCampaign(token, campaignId);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      alert(String(err?.message || t("dashboard.leaveError")));
    }
  }, [token, t]);

  if (!token) {
    return (
      <main className="dash">
        <h1 className="dash-title">{t("dashboard.title")}</h1>
        <div className="dash-state">{t("dashboard.notLoggedIn")}</div>
        <button className="dash-create" onClick={() => navigate("/login")}>
          {t("dashboard.loginBtn")}
        </button>
      </main>
    );
  }

  return (
    <main className="dash">
      <h1 className="dash-title">{t("dashboard.title")}</h1>

      {loading && <div className="dash-state">{t("dashboard.loading")}</div>}

      {!loading && (
        <section className="grid">
          <article
            className="card card-create"
            onClick={() => navigate("/campaigns/create")}
            role="button"
            tabIndex={0}
          >
            <div className="card-top">
              <span className="tag">{t("dashboard.createBtn")}</span>
              <span className="role role-mj">MJ</span>
            </div>
            <div className="card-title">{t("dashboard.createTitle")}</div>
            <div className="card-meta">{t("dashboard.createMeta")}</div>
            <div className="card-action">{t("dashboard.createBtn")}</div>
          </article>

          <article className="card card-join" onClick={openJoin} role="button" tabIndex={0}>
            <div className="card-top">
              <span className="tag">Code</span>
              <span className="role role-player">Player</span>
            </div>
            <div className="card-title">{t("dashboard.joinTitle")}</div>
            <div className="card-meta">{t("dashboard.joinMeta")}</div>
            <div className="card-action">{t("dashboard.joinBtn")}</div>
          </article>

          {campaigns.map((c) => {
            if (!c?.id) return null;
            return (
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
                  {t("dashboard.lastActivity")}: {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}
                </div>

                <div className="card-action">
                  {c.role === "Player" && (
                    <button
                      type="button"
                      className="btn-quit"
                      onClick={(e) => {
                        e.stopPropagation();
                        leaveCampaign(c.id);
                      }}
                    >
                      {t("dashboard.quitBtn")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {joinOpen && (
        <div className="modal-overlay" onClick={closeJoin}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{t("dashboard.joinModal.title")}</div>

            {joinError && <div className="create-error">{joinError}</div>}

            <form onSubmit={submitJoin}>
              <input
                className="create-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t("dashboard.joinModal.placeholder")}
                maxLength={12}
                autoFocus
              />

              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={closeJoin} disabled={joinLoading}>
                  {t("dashboard.joinModal.cancel")}
                </button>
                <button type="submit" className="modal-confirm" disabled={joinLoading}>
                  {joinLoading ? t("dashboard.joinModal.loading") : t("dashboard.joinModal.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}