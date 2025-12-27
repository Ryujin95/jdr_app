// src/pages/EditorPage.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";
import "../CSS/Editor.css";

function EditorPage() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState("character");

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

  // --- AJOUT : attribution à un utilisateur ---
  const [users, setUsers] = useState([]);
  const [ownerUserId, setOwnerUserId] = useState(""); // "" = aucun

  // --- états du formulaire lieu ---
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");

  // --- NOUVEAU : select suppression lieu ---
  const [deleteLocationId, setDeleteLocationId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  // Charger les lieux existants (select perso + select suppression lieu)
  useEffect(() => {
    if (!token) return;

    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_URL}/locations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setLocations(list);

        if (!deleteLocationId && list.length > 0) {
          setDeleteLocationId(String(list[0].id));
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // AJOUT : charger les utilisateurs pour pouvoir attribuer un perso à un user
  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
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
      } catch (e) {
        console.error(e);
        setUsers([]);
      }
    };

    fetchUsers();
  }, [token]);

  // cleanup preview URL quand on change d'image
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

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

  const refreshLocations = async () => {
    try {
      const r = await fetch(`${API_URL}/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];
      setLocations(list);

      if (deleteLocationId && !list.some((l) => String(l.id) === String(deleteLocationId))) {
        setDeleteLocationId(list.length > 0 ? String(list[0].id) : "");
      }
    } catch (_) {}
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

      if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/admin/characters`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.log("BACK ERROR STATUS:", res.status);
        console.log("BACK ERROR BODY:", text);
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const created = await res.json().catch(() => null);

      // AJOUT : si un user est choisi, on attribue le perso via PATCH /admin/characters/{id}/owner
      const chosenOwnerId = ownerUserId ? Number(ownerUserId) : null;
      const createdId = created?.id;

      if (createdId && (chosenOwnerId !== null || ownerUserId === "")) {
        if (chosenOwnerId !== null) {
          const r2 = await fetch(`${API_URL}/admin/characters/${createdId}/owner`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId: chosenOwnerId }),
          });

          if (!r2.ok) {
            const t2 = await r2.text().catch(() => "");
            console.log("ASSIGN OWNER ERROR STATUS:", r2.status);
            console.log("ASSIGN OWNER ERROR BODY:", t2);
            throw new Error(t2 || "Le personnage a été créé, mais l'attribution au joueur a échoué.");
          }

          await r2.json().catch(() => null);
        }
      }

      setInfo("Personnage créé avec succès.");

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
      setLocationId("");
      setAvatarFile(null);
      setAvatarPreview(null);
      setOwnerUserId("");

      await refreshLocations();
    } catch (e2) {
      setError(e2.message || "Erreur inconnue côté personnage.");
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
        const text = await res.text();
        console.log("BACK ERROR STATUS:", res.status);
        console.log("BACK ERROR BODY:", text);
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      await res.json().catch(() => null);

      setInfo("Lieu créé avec succès.");
      setLocationName("");
      setLocationDescription("");

      await refreshLocations();
    } catch (e2) {
      setError(e2.message || "Erreur inconnue côté lieu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendLocationToTrash = async () => {
    setError(null);
    setInfo(null);

    if (!deleteLocationId) {
      setError("Choisis un lieu à supprimer.");
      return;
    }

    const loc = locations.find((l) => String(l.id) === String(deleteLocationId));
    const label = loc?.name ? ` "${loc.name}"` : "";

    const ok = window.confirm(`Envoyer ce lieu${label} dans la corbeille ?`);
    if (!ok) return;

    try {
      setSubmitting(true);

      const res = await fetch(`${API_URL}/trash/move/location/${deleteLocationId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Impossible d'envoyer ce lieu dans la corbeille.");
      }

      setInfo("Lieu envoyé dans la corbeille.");
      await refreshLocations();
    } catch (e) {
      setError(e.message || "Erreur lors de l'envoi du lieu dans la corbeille.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return <p style={{ padding: "2rem" }}>Tu dois être connecté pour utiliser l’éditeur.</p>;
  }

  return (
    <div className="character-form-page">
      <h1>Éditeur de contenu</h1>

      <div className="editor-mode-switch">
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
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">Aucun lieu</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Attribuer à un joueur
                <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
                  <option value="">Aucun</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username || u.email || `User #${u.id}`}
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Annuler
            </button>

            <button type="submit" className="primary-button" disabled={submitting}>
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

          <div className="form-section">
            <h2>Supprimer un lieu (corbeille)</h2>

            <div className="form-row">
              <label>
                Lieux existants
                <select
                  value={deleteLocationId}
                  onChange={(e) => setDeleteLocationId(e.target.value)}
                >
                  {locations.length === 0 ? (
                    <option value="">Aucun lieu</option>
                  ) : (
                    locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <button
                type="button"
                className="danger-button"
                onClick={handleSendLocationToTrash}
                disabled={submitting || !deleteLocationId}
              >
                Envoyer à la corbeille
              </button>
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

            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Créer le lieu"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EditorPage;
