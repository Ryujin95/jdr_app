// src/pages/CharacterEditPage.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";
import { apiGetCampaignMembers } from "../api/api";
import "../CSS/CharacterEdit.css";

function CharacterEditPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);
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
    clan: "",
    isPlayer: false,
    locationId: "",
    ownerUserId: "",
  });

  const [campaignId, setCampaignId] = useState(null);

  const [locations, setLocations] = useState([]);
  const [members, setMembers] = useState([]);
  const [ownerCandidates, setOwnerCandidates] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [transitionVideoFile, setTransitionVideoFile] = useState(null);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [videoName, setVideoName] = useState("");

  // ✅ important: on garde l'owner original pour ne pas le renvoyer inutilement en update
  const [initialOwnerUserId, setInitialOwnerUserId] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/characters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Erreur HTTP ${res.status}`);
        }

        const c = await res.json();

        const campId = c?.campaign?.id ? String(c.campaign.id) : null;
        setCampaignId(campId);

        const ownerId = c.owner?.id ? String(c.owner.id) : "";
        setInitialOwnerUserId(ownerId);

        setForm({
          nickname: c.nickname ?? "",
          firstname: c.firstname ?? "",
          lastname: c.lastname ?? "",
          age: c.age ?? "",
          biography: c.biography ?? "",
          strengths: c.strengths ?? "",
          weaknesses: c.weaknesses ?? "",
          clan: c.clan ?? "",
          isPlayer: !!c.isPlayer,
          locationId: c.location?.id ? String(c.location.id) : "",
          ownerUserId: ownerId,
        });

        setAvatarPreview(buildAssetUrl(c.avatarUrl));
        setVideoName(c.transitionVideoUrl ? c.transitionVideoUrl.split("/").pop() || "" : "");
      } catch (e) {
        if (e?.name === "AbortError") return;
        const msg = e?.message || "Erreur lors du chargement.";
        setError(msg);
        addNotification?.({ type: "error", message: msg });
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
    return () => controller.abort();
  }, [id, token, addNotification]);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_URL}/characters/${id}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          setLocations([]);
          return;
        }

        const data = await res.json().catch(() => []);
        setLocations(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setLocations([]);
      }
    };

    fetchLocations();
    return () => controller.abort();
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    if (!campaignId) {
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

        const candidates = list.filter((m) => {
          const role = String(m?.role || "").toLowerCase();
          return role === "player";
        });

        setOwnerCandidates(candidates);
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
      fd.append("clan", form.clan ?? "");
      fd.append("isPlayer", form.isPlayer ? "true" : "false");
      fd.append("locationId", form.locationId || "");

      // ✅ Fix: en édition, si l'owner n'a pas changé, on ne le renvoie pas.
      // Ça évite la vérif "ce joueur a déjà un perso" qui ne filtre pas toujours le perso courant côté back.
      if (!form.isPlayer) {
        fd.append("ownerUserId", "");
      } else {
        const current = String(form.ownerUserId || "");
        const initial = String(initialOwnerUserId || "");
        if (!current) {
          fd.append("ownerUserId", "");
        } else if (current !== initial) {
          fd.append("ownerUserId", current);
        }
      }

      if (avatarFile) fd.append("avatar", avatarFile);
      if (transitionVideoFile) fd.append("transitionVideo", transitionVideoFile);

      const res = await fetch(`${API_URL}/characters/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        let msg = text;
        try {
          const json = text ? JSON.parse(text) : null;
          msg = json?.message || json?.detail || msg;
        } catch {}
        throw new Error(msg || `Erreur HTTP ${res.status}`);
      }

      let updated = null;
      try {
        updated = text ? JSON.parse(text) : null;
      } catch {
        updated = null;
      }

      if (updated && typeof updated === "object") {
        const newOwnerId = updated.owner?.id ? String(updated.owner.id) : "";
        setInitialOwnerUserId(newOwnerId);

        setForm((p) => ({
          ...p,
          nickname: updated.nickname ?? p.nickname,
          firstname: updated.firstname ?? p.firstname,
          lastname: updated.lastname ?? p.lastname,
          age: updated.age ?? p.age,
          biography: updated.biography ?? p.biography,
          strengths: updated.strengths ?? p.strengths,
          weaknesses: updated.weaknesses ?? p.weaknesses,
          clan: updated.clan ?? p.clan,
          isPlayer: typeof updated.isPlayer === "boolean" ? updated.isPlayer : p.isPlayer,
          locationId: updated.location?.id ? String(updated.location.id) : p.locationId,
          ownerUserId: newOwnerId || p.ownerUserId,
        }));

        setAvatarPreview(buildAssetUrl(updated.avatarUrl));
        setVideoName(updated.transitionVideoUrl ? updated.transitionVideoUrl.split("/").pop() || "" : "");
      }

      setSuccess("Modifications enregistrées.");
      addNotification?.({ type: "success", message: "Modifications enregistrées." });

      setTimeout(() => navigate(-1), 450);
    } catch (err) {
      const msg = err?.message || "Erreur lors de l'enregistrement.";
      setError(msg);
      addNotification?.({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <p className="edit-message">Connecte-toi pour modifier un personnage.</p>;
  if (loading) return <p className="edit-message">Chargement…</p>;
  if (error) return <p className="edit-message edit-error">Erreur : {error}</p>;

  return (
    <div className="character-edit-page">
      <button className="edit-back-button" onClick={() => navigate(-1)}>
        ← Retour
      </button>
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

          <label className="edit-field">
            <span>Lieu actuel</span>
            <select name="locationId" value={form.locationId || ""} onChange={onChange}>
              <option value="">Aucun lieu</option>
              {locations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </option>
              ))}
            </select>
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

            {!membersLoading && ownerCandidates.length === 0 && (
              <div className="edit-hint">Aucun joueur disponible (vérifie le rôle dans /members)</div>
            )}
          </label>
        )}

        <label className="edit-field">
          <span>Histoire</span>
          <textarea name="biography" value={form.biography} onChange={onChange} rows={5} />
        </label>

        <div className="edit-grid-2">
          <label className="edit-field">
            <span>Points forts</span>
            <textarea name="strengths" value={form.strengths} onChange={onChange} rows={4} />
          </label>

          <label className="edit-field">
            <span>Faiblesses</span>
            <textarea name="weaknesses" value={form.weaknesses} onChange={onChange} rows={4} />
          </label>
        </div>

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
    </div>
  );
}

export default CharacterEditPage;