import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/Characters.css";

function CharactersPage() {
  const { token } = useContext(AuthContext);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const showTrashButton = !!token;

  const BACK_BASE_URL = API_URL.replace(/\/api\/?$/, "");

  const resolveAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;

    const url = String(avatarUrl).trim();

    if (/^https?:\/\//i.test(url)) return url;

    if (url.startsWith("/")) return `${BACK_BASE_URL}${url}`;

    if (url.startsWith("image/")) return `${BACK_BASE_URL}/${url}`;

    if (url.startsWith("uploads/")) return `${BACK_BASE_URL}/${url}`;

    return `${BACK_BASE_URL}/image/${url}`;
  };

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/characters`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      setCharacters(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchCharacters();
  }, [token, fetchCharacters]);

  const handleCardClick = (id) => {
    navigate(`/transition-video/${id}`);
  };

  const handleEditCharacter = (event, id) => {
    event.stopPropagation();
    navigate(`/characters/${id}/edit`);
  };

  const handleSendToTrash = async (event, id) => {
    event.stopPropagation();

    const confirmDelete = window.confirm("Envoyer ce personnage dans la corbeille ?");
    if (!confirmDelete) return;

    try {
      setError(null);

      const res = await fetch(`${API_URL}/trash/move/character/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Impossible d'envoyer ce personnage dans la corbeille.");
      }

      setCharacters((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message || "Erreur lors de l'envoi dans la corbeille.");
    }
  };

  const charactersByClan = useMemo(() => {
    const grouped = {};

    for (const char of characters) {
      const clanName = char.clan && char.clan.trim() !== "" ? char.clan : "Sans clan";
      if (!grouped[clanName]) grouped[clanName] = [];
      grouped[clanName].push(char);
    }

    return Object.entries(grouped).sort(([a], [b]) =>
      a.localeCompare(b, "fr", { sensitivity: "base" })
    );
  }, [characters]);

  if (!token) {
    return <p style={{ padding: "2rem" }}>Connecte-toi pour voir les personnages.</p>;
  }

  if (loading) {
    return <p style={{ padding: "2rem" }}>Chargement des personnages...</p>;
  }

  if (error) {
    return (
      <p style={{ padding: "2rem", color: "red" }}>
        Erreur lors du chargement : {error}
      </p>
    );
  }

  if (characters.length === 0) {
    return <p style={{ padding: "2rem" }}>Aucun personnage pour l’instant.</p>;
  }

  return (
    <div className="characters-page">
      <h1>Personnages du JDR</h1>

      {charactersByClan.map(([clanName, clanCharacters]) => (
        <section key={clanName} className="clan-section">
          <h2 className="clan-title">{clanName}</h2>

          <div className="characters-grid">
            {clanCharacters.map((char) => {
              const avatarSrc = resolveAvatarUrl(char.avatarUrl);

              return (
                <div
                  key={char.id}
                  className="character-card"
                  onClick={() => handleCardClick(char.id)}
                >
                  <div className="character-avatar-wrapper">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={char.nickname || char.firstname}
                        className="character-avatar"
                      />
                    ) : (
                      <div className="character-avatar placeholder">
                        {char.nickname?.charAt(0) || char.firstname?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>

                  <div className="character-info">
                    <h3 className="character-nickname">{char.nickname}</h3>
                    <p className="character-name">
                      {char.firstname} {char.lastname}
                    </p>
                    <p className="character-age">{char.age} ans</p>

                    {char.isPlayer ? (
                      <span className="character-badge player-badge">Joueur</span>
                    ) : (
                      <span className="character-badge npc-badge">PNJ</span>
                    )}

                    {showTrashButton && (
                      <div className="character-actions">
                        <button
                          type="button"
                          className="character-edit-button"
                          onClick={(event) => handleEditCharacter(event, char.id)}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="character-trash-button"
                          onClick={(event) => handleSendToTrash(event, char.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default CharactersPage;
