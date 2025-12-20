import { useEffect, useState, useContext, useMemo } from "react";
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

  // pour l’instant : tout utilisateur connecté voit le bouton
  const showTrashButton = !!token;

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const res = await fetch(`${API_URL}/characters`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Erreur HTTP ${res.status}`);
        }

        const data = await res.json();
        setCharacters(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCharacters();
    }
  }, [token]);

  const handleCardClick = (id) => {
    navigate(`/transition-video/${id}`);
  };

  const handleSendToTrash = async (event, id) => {
    event.stopPropagation();

    const confirmDelete = window.confirm(
      "Envoyer ce personnage dans la corbeille ?"
    );
    if (!confirmDelete) {
      return;
    }

    try {
      setError(null);

      const res = await fetch(`${API_URL}/characters/${id}/trash`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            "Impossible d'envoyer ce personnage dans la corbeille."
        );
      }

      // On retire le perso de la liste côté front
      setCharacters((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message || "Erreur lors de l'envoi dans la corbeille.");
    }
  };

  const charactersByClan = useMemo(() => {
    const grouped = {};

    for (const char of characters) {
      const clanName =
        char.clan && char.clan.trim() !== "" ? char.clan : "Sans clan";
      if (!grouped[clanName]) {
        grouped[clanName] = [];
      }
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
            {clanCharacters.map((char) => (
              <div
                key={char.id}
                className="character-card"
                onClick={() => handleCardClick(char.id)}
              >
                <div className="character-avatar-wrapper">
                  {char.avatarUrl ? (
                    <img
                      src={char.avatarUrl}
                      alt={char.nickname || char.firstname}
                      className="character-avatar"
                    />
                  ) : (
                    <div className="character-avatar placeholder">
                      {char.nickname?.charAt(0) ||
                        char.firstname?.charAt(0) ||
                        "?"}
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
                    <button
                      className="character-trash-button"
                      onClick={(event) => handleSendToTrash(event, char.id)}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default CharactersPage;
