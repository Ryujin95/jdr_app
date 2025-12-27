// src/pages/CharacterEditPage.jsx
import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/CharacterEdit.css";

function CharacterEditPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
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
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [transitionVideoFile, setTransitionVideoFile] = useState(null);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [videoName, setVideoName] = useState("");

  // ✅ AJOUT : liste users + owner select
  const [users, setUsers] = useState([]);
  const [ownerUserId, setOwnerUserId] = useState(""); // "" = aucun
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/characters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Erreur HTTP ${res.status}`);
        }

        const c = await res.json();

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
        });

        setAvatarPreview(buildAssetUrl(c.avatarUrl));
        setVideoName(c.transitionVideoUrl ? (c.transitionVideoUrl.split("/").pop() || "") : "");

        // ✅ AJOUT : si ton API renvoie owner (optionnel), on pré-sélectionne
        if (c.owner?.id != null) {
          setOwnerUserId(String(c.owner.id));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [id, token]);

  // ✅ AJOUT : fetch users pour remplir le select
  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setUsers([]);
          return;
        }

        const data = await res.json().catch(() => []);
        setUsers(Array.isArray(data) ? data : []);
      } catch (_) {
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: checked }));
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
      const fd = new FormData();

      fd.append("nickname", form.nickname);
      fd.append("firstname", form.firstname);
      fd.append("lastname", form.lastname);
      fd.append("age", String(form.age));
      fd.append("biography", form.biography);
      fd.append("strengths", form.strengths);
      fd.append("weaknesses", form.weaknesses);
      fd.append("clan", form.clan);
      fd.append("isPlayer", form.isPlayer ? "true" : "false");
      fd.append("locationId", form.locationId || "");

      if (avatarFile) fd.append("avatar", avatarFile);
      if (transitionVideoFile) fd.append("transitionVideo", transitionVideoFile);

      const res = await fetch(`${API_URL}/characters/${id}`, {
        method: "POST", // on ne touche pas à ta logique actuelle
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Erreur HTTP ${res.status}`);
      }

      // ✅ AJOUT : attribution owner via route admin (si sélection)
      // si ownerUserId === "" -> on retire l'owner (null)
      const ownerPayload = { userId: ownerUserId === "" ? null : Number(ownerUserId) };

      const r2 = await fetch(`${API_URL}/admin/characters/${id}/owner`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ownerPayload),
      });

      if (!r2.ok) {
        const t2 = await r2.text().catch(() => "");
        throw new Error(t2 || "Modif OK, mais attribution joueur impossible.");
      }

      setSuccess("Modifications enregistrées.");
      setTimeout(() => navigate(`/characters/${id}`), 450);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return <p className="edit-message">Connecte-toi pour modifier un personnage.</p>;
  }

  if (loading) {
    return <p className="edit-message">Chargement…</p>;
  }

  if (error) {
    return <p className="edit-message edit-error">Erreur : {error}</p>;
  }

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
            <span>Location ID</span>
            <input
              name="locationId"
              value={form.locationId}
              onChange={onChange}
              placeholder="ex: 1, 2, 3…"
            />
          </label>

          <label className="edit-field edit-checkbox">
            <input type="checkbox" name="isPlayer" checked={form.isPlayer} onChange={onChange} />
            <span>Personnage joueur</span>
          </label>

          {/* ✅ AJOUT : attribution joueur */}
          <label className="edit-field">
            <span>Attribuer à un joueur</span>
            <select
              value={ownerUserId}
              onChange={(e) => setOwnerUserId(e.target.value)}
              disabled={usersLoading}
            >
              <option value="">{usersLoading ? "Chargement…" : "Aucun"}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username || u.email || `User #${u.id}`}
                </option>
              ))}
            </select>
          </label>
        </div>

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
