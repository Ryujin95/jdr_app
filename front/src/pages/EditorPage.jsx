// src/pages/EditorPage.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";
import "../CSS/Editor.css"; // tu peux ajuster le nom de CSS

function EditorPage() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState("character"); // "character" ou "location"

  // --- états communs au formulaire personnage ---
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

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // --- états du formulaire lieu ---
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  // Charger les lieux existants pour le select (quand on crée un perso)
  useEffect(() => {
    if (!token) return;

    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_URL}/locations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setLocations(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchLocations();
  }, [token]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSubmitCharacter = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!nickname.trim()) {
      setError("Le surnom est obligatoire pour le personnage.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
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

      if (locationId) {
        formData.append("locationId", locationId);
      }

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/characters`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || "Erreur lors de la création du personnage."
        );
      }

      setInfo("Personnage créé avec succès.");
      // tu peux choisir :
      // navigate("/characters");
    } catch (e) {
      setError(e.message || "Erreur inconnue côté personnage.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLocation = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!locationName.trim()) {
      setError("Le nom du lieu est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: locationName,
          description: locationDescription,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || "Erreur lors de la création du lieu."
        );
      }

      setInfo("Lieu créé avec succès.");
      // tu peux choisir :
      // navigate("/map");
    } catch (e) {
      setError(e.message || "Erreur inconnue côté lieu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <p style={{ padding: "2rem" }}>
        Tu dois être connecté pour utiliser l’éditeur.
      </p>
    );
  }

  return (
    <div className="character-form-page">
      <h1>Éditeur de contenu</h1>

        <div className="editor-mode-switch">
    {/* fond qui glisse */}
    <div className={`editor-mode-slider ${mode}`}></div>

    <button
        type="button"
        className={mode === "character" ? "mode-button active" : "mode-button"}
        onClick={() => setMode("character")}
    >
        Personnage
    </button>
    <button
        type="button"
        className={mode === "location" ? "mode-button active" : "mode-button"}
        onClick={() => setMode("location")}
    >
        Lieu
    </button>
    </div>


      {error && <p className="form-error">{error}</p>}
      {info && <p className="form-info">{info}</p>}

      {mode === "character" && (
        <form className="character-form" onSubmit={handleSubmitCharacter}>
          <div className="form-section">
            <h2>Identité du personnage</h2>

            <div className="form-row">
              <label>
                Prénom
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                />
              </label>

              <label>
                Nom
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                />
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
                <input
                  type="number"
                  min="0"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
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
                <input
                  type="checkbox"
                  checked={isPlayer}
                  onChange={(e) => setIsPlayer(e.target.checked)}
                />
                Personnage joueur
              </label>
            </div>

            <div className="form-row">
              <label>
                Lieu actuel
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">Aucun lieu</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Histoire et personnalité</h2>

            <label>
              Biographie
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                rows={5}
              />
            </label>

            <label>
              Points forts
              <textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                rows={3}
              />
            </label>

            <label>
              Points faibles
              <textarea
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                rows={3}
              />
            </label>
          </div>

          <div className="form-section">
            <h2>Secret (MJ)</h2>

            <label>
              Secret principal
              <textarea
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                rows={3}
              />
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? "Enregistrement..." : "Créer le personnage"}
            </button>
          </div>
        </form>
      )}

      {mode === "location" && (
        <form className="character-form" onSubmit={handleSubmitLocation}>
          <div className="form-section">
            <h2>Créer un lieu</h2>

            <label>
              Nom du lieu
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
                rows={4}
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
            >
              {submitting ? "Enregistrement..." : "Créer le lieu"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EditorPage;
