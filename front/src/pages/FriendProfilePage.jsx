// src/pages/FriendProfilePage.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { apiGetFriendProfile, apiRemoveFriend } from "../api/api";
import "../CSS/FriendProfilePage.css";
import "../CSS/HomePage.css";

export default function FriendProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { token } = useContext(AuthContext);

  const friendId = useMemo(() => {
    const n = Number(userId);
    return Number.isFinite(n) ? n : 0;
  }, [userId]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setErr("");
      setLoading(true);
      setProfile(null);

      if (!token) {
        setErr("Non connecté.");
        setLoading(false);
        return;
      }

      if (!friendId) {
        setErr("Ami introuvable.");
        setLoading(false);
        return;
      }

      try {
        const data = await apiGetFriendProfile(token, friendId);
        if (!alive) return;
        setProfile(data || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Erreur lors du chargement du profil.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [token, friendId]);

  async function onRemoveFriend() {
    if (!token || !friendId) return;

    const ok = window.confirm("Retirer cet ami ?");
    if (!ok) return;

    try {
      await apiRemoveFriend(token, friendId);
      navigate("/friends");
    } catch (e) {
      setErr(e?.message || "Impossible de retirer cet ami.");
    }
  }

  const username = profile?.username || "Profil ami";
  const campaigns = Array.isArray(profile?.campaigns) ? profile.campaigns : [];

  const visibility = String(profile?.campaignVisibility || "");
  const visibilityLabel =
    visibility === "ALL_FRIENDS"
      ? "tout"
      : visibility === "COMMON_ONLY"
      ? "en commun"
      : "";

  return (
    <div className="friend-profile-page">
      <div className="friend-profile-header">
        <div className="friend-profile-title">
          <h1 className="friend-profile-h1">{username}</h1>
          <div className="friend-profile-subtitle">Profil ami</div>
        </div>

        <div className="friend-profile-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Retour
          </button>

          <button type="button" className="btn-danger" onClick={onRemoveFriend}>
            Retirer des amis
          </button>
        </div>
      </div>

      {loading && <div className="friend-profile-loading">Chargement…</div>}

      {!loading && err && <div className="friend-profile-error">{err}</div>}

      {!loading && !err && (
        <div className="friend-profile-content">
          <h2 className="friend-profile-h2">Ses JDR</h2>

          {campaigns.length === 0 ? (
            <div className="friend-profile-empty">Aucun JDR visible.</div>
          ) : (
            <div className="friend-profile-grid">
              {campaigns.map((c) => {
                const id = c?.id;
                const title = c?.name || "JDR";
                const friendRole = c?.friendRole ? String(c.friendRole) : null;

                return (
                 <div key={String(id ?? title)} className="friend-card">
  <div className="friend-card__header">
    <div className="friend-card__title">{title}</div>
  </div>

  <div className="friend-card__stats">
    <div className="mini-box">
      <div className="mini-box__label">Personnages</div>
      <div className="mini-box__value">{c?.charactersCount ?? "-"}</div>
    </div>

    <div className="mini-box">
      <div className="mini-box__label">Lieux</div>
      <div className="mini-box__value">{c?.locationsCount ?? "-"}</div>
    </div>

    <div className="mini-box">
      <div className="mini-box__label">Invités</div>
      <div className="mini-box__value">{c?.membersCount ?? "-"}</div>
    </div>

    <div className="mini-box">
      <div className="mini-box__label">Rôle</div>
      <div className="mini-box__value">{friendRole ?? "-"}</div>
    </div>
  </div>
</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}