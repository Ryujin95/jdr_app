// src/pages/CharacterEditPage.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import {
  apiGetAdminCharacter,
  apiUpdateCharacter,
  apiGetCampaignMembers,
  apiGetKnowledgeState,
  apiGrantKnowledge,
  apiRevokeKnowledge,
} from "../api/api";
import "../CSS/CharacterEdit.css";

function CharacterEditPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const assetBase = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);
  const buildAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${assetBase}${path}`;
    return `${assetBase}/${path}`;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    nickname: "",
    firstname: "",
    lastname: "",
    age: "",
    biography: "",
    strengths: "",
    weaknesses: "",
    secret: "",
    clan: "",
    isPlayer: false,
    ownerUserId: "",
  });

  const [campaignId, setCampaignId] = useState(null);
  const [members, setMembers] = useState([]);
  const [ownerCandidates, setOwnerCandidates] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [transitionVideoFile, setTransitionVideoFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [videoName, setVideoName] = useState("");
  const [initialOwnerUserId, setInitialOwnerUserId] = useState("");

  const [visOpen, setVisOpen] = useState(false);
  const [visField, setVisField] = useState("");
  const [visAllowedIds, setVisAllowedIds] = useState(new Set());
  const [visLoading, setVisLoading] = useState(false);

  const characterIdNum = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : 0;
  }, [id]);

  const playersForModal = useMemo(() => {
    return (Array.isArray(members) ? members : []).filter(
      (m) => String(m?.role || "").toLowerCase() === "player"
    );
  }, [members]);

  const fieldLabel = (f) => {
    const labels = { biography: "Histoire", strengths: "Points forts", weaknesses: "Faiblesses", secret: "Secret" };
    return labels[f] || f;
  };

  const openVisibilityModal = async (fieldKey) => {
    if (!token || !characterIdNum) return;

    setVisOpen(true);
    setVisField(fieldKey);
    setVisAllowedIds(new Set());
    setVisLoading(true);

    try {
      const out = await apiGetKnowledgeState(token, characterIdNum, fieldKey);
      const allowed = Array.isArray(out?.allowedViewerIds) ? out.allowedViewerIds : [];
      setVisAllowedIds(new Set(allowed.map((x) => String(x))));
    } catch (e) {
      addNotification({ type: "error", message: e?.message || "Erreur visibilité." });
      setVisAllowedIds(new Set());
    } finally {
      setVisLoading(false);
    }
  };

  const toggleViewer = async (viewerIdRaw) => {
    if (!token || !characterIdNum || !visField) return;

    const viewerId = Number(viewerIdRaw);
    if (!Number.isFinite(viewerId) || viewerId <= 0) return;

    const key = String(viewerId);
    const wasAllowed = visAllowedIds.has(key);

    setVisAllowedIds((prev) => {
      const next = new Set(prev);
      wasAllowed ? next.delete(key) : next.add(key);
      return next;
    });

    try {
      if (wasAllowed) {
        await apiRevokeKnowledge(token, { viewerId, characterId: characterIdNum, field: visField });
      } else {
        await apiGrantKnowledge(token, { viewerId, characterId: characterIdNum, field: visField, notes: null });
      }
    } catch (e) {
      setVisAllowedIds((prev) => {
        const next = new Set(prev);
        wasAllowed ? next.add(key) : next.delete(key);
        return next;
      });
      addNotification({ type: "error", message: e?.message || "Erreur toggle visibilité." });
    }
  };

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await apiGetAdminCharacter(token, id, { signal: controller.signal });
        const campId = c?.campaign?.id ? String(c.campaign.id) : null;
        const ownerId = c?.owner?.id ? String(c.owner.id) : "";

        setCampaignId(campId);
        setInitialOwnerUserId(ownerId);
        setForm({
          nickname: c?.nickname ?? "",
          firstname: c?.firstname ?? "",
          lastname: c?.lastname ?? "",
          age: c?.age ?? "",
          biography: c?.biography ?? "",
          strengths: c?.strengths ?? "",
          weaknesses: c?.weaknesses ?? "",
          secret: c?.secret ?? "",
          clan: c?.clan ?? "",
          isPlayer: !!c?.isPlayer,
          ownerUserId: ownerId,
        });
        setAvatarPreview(buildAssetUrl(c?.avatarUrl));
        setVideoName(c?.transitionVideoUrl ? c.transitionVideoUrl.split("/").pop() || "" : "");
      } catch (e) {
        if (e?.name === "AbortError") return;
        const msg = e?.message || "Erreur lors du chargement.";
        setError(msg);
        addNotification({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
    return () => controller.abort();
  }, [id, token]);

  useEffect(() => {
    if (!token || !campaignId) {
      setMembers([]);
      setOwnerCandidates([]);
      return;
    }

    const controller = new AbortController();
    setMembersLoading(true);

    (async () => {
      try {
        const data = await apiGetCampaignMembers(token, campaignId, { signal: controller.signal });
        const list = Array.isArray(data) ? data : [];
        setMembers(list);
        setOwnerCandidates(list.filter((m) => String(m?.role || "").toLowerCase() === "player"));
      } catch (e) {
        if (e?.name === "AbortError") return;
        setMembers([]);
        setOwnerCandidates([]);
      } finally {
        setMembersLoading(false);
      }
    })();

    return () => controller.abort();
  }, [token, campaignId]);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((p) => {
        const next = { ...p, [name]: checked };
        if (name === "isPlayer" && !checked) next.ownerUserId = "";
        return next;
      });
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.nickname || !String(form.nickname).trim()) {
        throw new Error("Le surnom (nickname) est obligatoire.");
      }

      const fd = new FormData();
      fd.append("nickname", String(form.nickname).trim());
      fd.append("firstname", form.firstname ?? "");
      fd.append("lastname", form.lastname ?? "");
      fd.append("age", String(form.age ?? ""));
      fd.append("biography", form.biography ?? "");
      fd.append("strengths", form.strengths ?? "");
      fd.append("weaknesses", form.weaknesses ?? "");
      fd.append("secret", form.secret ?? "");
      fd.append("clan", form.clan ?? "");
      fd.append("isPlayer", form.isPlayer ? "true" : "false");

      if (!form.isPlayer) {
        fd.append("ownerUserId", "");
      } else {
        const current = String(form.ownerUserId || "");
        const initial = String(initialOwnerUserId || "");
        fd.append("ownerUserId", !current ? "" : current !== initial ? current : "");
      }

      if (avatarFile) fd.append("avatar", avatarFile);
      if (transitionVideoFile) fd.append("transitionVideo", transitionVideoFile);

      const updated = await apiUpdateCharacter(token, id, fd);

      if (updated && typeof updated === "object") {
        const newOwnerId = updated?.owner?.id ? String(updated.owner.id) : "";
        setInitialOwnerUserId(newOwnerId);
        setForm((p) => ({
          ...p,
          nickname: updated?.nickname ?? p.nickname,
          firstname: updated?.firstname ?? p.firstname,
          lastname: updated?.lastname ?? p.lastname,
          age: updated?.age ?? p.age,
          biography: updated?.biography ?? p.biography,
          strengths: updated?.strengths ?? p.strengths,
          weaknesses: updated?.weaknesses ?? p.weaknesses,
          secret: updated?.secret ?? p.secret,
          clan: updated?.clan ?? p.clan,
          isPlayer: typeof updated?.isPlayer === "boolean" ? updated.isPlayer : p.isPlayer,
          ownerUserId: newOwnerId || p.ownerUserId,
        }));
        setAvatarPreview(buildAssetUrl(updated?.avatarUrl));
        setVideoName(updated?.transitionVideoUrl ? updated.transitionVideoUrl.split("/").pop() || "" : "");
      }

      setSuccess("Modifications enregistrées.");
      addNotification({ type: "success", message: "Modifications enregistrées." });
      setTimeout(() => navigate(-1), 450);
    } catch (err) {
      const msg = err?.message || "Erreur lors de l'enregistrement.";
      setError(msg);
      addNotification({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <p className="edit-message">Connecte-toi pour modifier un personnage.</p>;
  if (loading) return <p className="edit-message">Chargement…</p>;
  if (error) return <p className="edit-message edit-error">Erreur : {error}</p>;

  return (
    <div className="character-edit-page">
      <button className="edit-back-button" onClick={() => navigate(-1)}>← Retour</button>
      <h1 className="edit-title">Modifier le personnage</h1>

      <form className="edit-form" onSubmit={onSubmit}>
        <div className="edit-grid">
          <label className="edit-field">
            <span>Surnom</span>
            <input name="nickname" value={form.nickname} onChange={onChange} required />
          </label>
          <label className="edit-field">
            <span>Prénom</span>
            <input name="firstname" value={form.firstname} onChange={onChange} />
          </label>
          <label className="edit-field">
            <span>Nom</span>
            <input name="lastname" value={form.lastname} onChange={onChange} />
          </label>
          <label className="edit-field">
            <span>Âge</span>
            <input name="age" value={form.age} onChange={onChange} inputMode="numeric" />
          </label>
          <label className="edit-field">
            <span>Clan</span>
            <input name="clan" value={form.clan} onChange={onChange} />
          </label>
          <label className="edit-field edit-checkbox">
            <input type="checkbox" name="isPlayer" checked={form.isPlayer} onChange={onChange} />
            <span>Personnage joueur</span>
          </label>
        </div>

        {form.isPlayer && (
          <label className="edit-field">
            <span>Attribuer à un joueur</span>
            <select name="ownerUserId" value={form.ownerUserId || ""} onChange={onChange} disabled={membersLoading}>
              <option value="">{membersLoading ? "Chargement…" : "Choisir un joueur"}</option>
              {ownerCandidates.map((m) => {
                const uid = m.userId ?? m.id;
                if (!uid) return null;
                return (
                  <option key={String(uid)} value={String(uid)}>
                    {m.username || m.email || `User #${uid}`}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        {["biography", "strengths", "weaknesses", "secret"].map((field) => (
          <label key={field} className="edit-field">
            <div className="knowledge-field-header">
              <span>{fieldLabel(field)}</span>
              <button
                type="button"
                className="knowledge-btn"
                onClick={() => openVisibilityModal(field)}
                disabled={membersLoading || !campaignId}
              >
                Visibilité
              </button>
            </div>
            <textarea
              name={field}
              value={form[field]}
              onChange={onChange}
              rows={field === "biography" || field === "secret" ? 5 : 4}
            />
          </label>
        ))}

        <div className="edit-media">
          <div className="edit-media-block">
            <div className="edit-media-title">Avatar</div>
            <div className="edit-media-row">
              {avatarPreview ? (
                <img className="edit-avatar-preview" src={avatarPreview} alt="Aperçu avatar" />
              ) : (
                <div className="edit-avatar-placeholder" />
              )}
              <div className="edit-media-controls">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
                <div className="edit-hint">jpg, png, webp</div>
              </div>
            </div>
          </div>

          <div className="edit-media-block">
            <div className="edit-media-title">Vidéo de transition</div>
            <div className="edit-media-row">
              <div className="edit-video-chip">
                {transitionVideoFile ? transitionVideoFile.name : videoName || "Aucune"}
              </div>
              <div className="edit-media-controls">
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) => setTransitionVideoFile(e.target.files?.[0] || null)}
                />
                <div className="edit-hint">mp4 (recommandé), webm</div>
              </div>
            </div>
          </div>
        </div>

        {success && <div className="edit-success">{success}</div>}

        <button className="edit-submit" type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>

      {visOpen && (
        <div
          className="knowledge-modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setVisOpen(false); }}
        >
          <div className="knowledge-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="knowledge-modal-header">
              <h2 className="knowledge-modal-title">Visibilité — {fieldLabel(visField)}</h2>
              <button type="button" className="knowledge-close" onClick={() => setVisOpen(false)}>
                Fermer
              </button>
            </div>

            {visLoading ? (
              <div className="knowledge-loading">Chargement…</div>
            ) : playersForModal.length === 0 ? (
              <div className="knowledge-empty">Aucun joueur trouvé dans /members.</div>
            ) : (
              <div className="knowledge-users">
                {playersForModal.map((m) => {
                  const uid = m.userId ?? m.id;
                  if (!uid) return null;
                  const isOn = visAllowedIds.has(String(uid));
                  const label = m.username || m.email || `User #${uid}`;
                  return (
                    <button
                      key={String(uid)}
                      type="button"
                      className={`knowledge-user ${isOn ? "on" : "off"}`}
                      onClick={() => toggleViewer(uid)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterEditPage;