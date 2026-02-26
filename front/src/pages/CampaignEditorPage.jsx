// src/pages/CampaignEditorPage.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";
import "../CSS/Editor.css";

function CampaignEditorPage({ onClose, onCreated, embed = false }) {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const outlet = useOutletContext() || {};
  const campaignId = outlet.campaignId ? String(outlet.campaignId) : null;
  const isMjInThisCampaign = !!outlet.isMjInThisCampaign;

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [biography, setBiography] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [clan, setClan] = useState("");
  const [isPlayer, setIsPlayer] = useState(false);
  const [secret, setSecret] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const authHeaders = useMemo(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const close = () => {
    if (typeof onClose === "function") onClose();
    else navigate(-1);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;

    if (!file || !(file instanceof File) || file.size === 0) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const resetCharacterForm = () => {
    setFirstname("");
    setLastname("");
    setNickname("");
    setAge("");
    setBiography("");
    setStrengths("");
    setWeaknesses("");
    setClan("");
    setIsPlayer(false);
    setSecret("");
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmitCharacter = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!campaignId) {
      setError("CampaignId manquant (ouvre une campagne puis l’onglet Personnages).");
      return;
    }

    if (!nickname.trim()) {
      setError("Le surnom est obligatoire pour le personnage.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("campaignId", campaignId);

      formData.append("firstname", firstname);
      formData.append("lastname", lastname);
      formData.append("nickname", nickname);
      formData.append("age", age || "");
      formData.append("biography", biography);
      formData.append("strengths", strengths);
      formData.append("weaknesses", weaknesses);
      formData.append("clan", clan);
      formData.append("isPlayer", isPlayer ? "1" : "0");
      formData.append("secret", secret);

      if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/characters`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur création personnage (HTTP ${res.status})`);
      }

      await res.json().catch(() => null);

      setInfo("Personnage créé avec succès.");
      resetCharacterForm();

      if (typeof onCreated === "function") {
        try {
          await onCreated();
        } catch {
          // ignore
        }
      }

      if (embed && typeof onClose === "function") {
        onClose();
      }
    } catch (e2) {
      setError(e2?.message || "Erreur inconnue côté personnage.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return <p style={{ padding: "2rem" }}>Tu dois être connecté.</p>;
  if (!campaignId) return <p style={{ padding: "2rem" }}>Aucune campagne active (ouvre une campagne).</p>;
  if (!isMjInThisCampaign) return <p style={{ padding: "2rem" }}>Tu n’es pas MJ sur cette campagne.</p>;

  const content = (
    <div className={`character-form-page ${embed ? "character-form-page--embed" : ""}`}>
      <h1>{embed ? "Créer un personnage" : "Éditeur de contenu"}</h1>

      {error && <p className="form-error">{error}</p>}
      {info && <p className="form-info">{info}</p>}

      <form className="character-form" onSubmit={handleSubmitCharacter}>
        <div className="form-section">
          <h2>Identité du personnage</h2>

          <div className="form-row">
            <label>
              Prénom
              <input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
            </label>

            <label>
              Nom
              <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>
              Surnom (obligatoire)
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </label>

            <label>
              Âge
              <input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
          </div>

          <div className="form-row">
            <label>
              Clan
              <input
                type="text"
                value={clan}
                onChange={(e) => setClan(e.target.value)}
                placeholder="Ex: Groupe de la prison"
              />
            </label>

            <label className="checkbox-label">
              <input type="checkbox" checked={isPlayer} onChange={(e) => setIsPlayer(e.target.checked)} />
              Personnage joueur
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Histoire et personnalité</h2>

          <label>
            Biographie
            <textarea value={biography} onChange={(e) => setBiography(e.target.value)} rows={5} />
          </label>

          <label>
            Points forts
            <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={3} />
          </label>

          <label>
            Points faibles
            <textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} rows={3} />
          </label>
        </div>

        <div className="form-section">
          <h2>Secret (MJ)</h2>

          <label>
            Secret principal
            <textarea value={secret} onChange={(e) => setSecret(e.target.value)} rows={3} />
          </label>
        </div>

        <div className="form-section">
          <h2>Avatar</h2>

          <div className="form-row">
            <label>
              Image du personnage
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>

            {avatarPreview && (
              <div className="avatar-preview">
                <p>Aperçu :</p>
                <img src={avatarPreview} alt="Aperçu avatar" />
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={close} disabled={submitting}>
            Annuler
          </button>

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Enregistrement..." : "Créer le personnage"}
          </button>
        </div>
      </form>
    </div>
  );

  if (embed) {
    return (
      <div
        className="editor-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="editor-overlay__panel">{content}</div>
      </div>
    );
  }

  return content;
}

export default CampaignEditorPage;