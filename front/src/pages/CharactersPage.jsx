import { useEffect, useState, useContext } from "react";
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
    navigate(`/characters/${id}`);
  };

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
      <div className="characters-grid">
        {characters.map((char) => (
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
                  {char.nickname?.charAt(0) || char.firstname?.charAt(0) || "?"}
                </div>
              )}
            </div>

            <div className="character-info">
              <h2 className="character-nickname">{char.nickname}</h2>
              <p className="character-name">
                {char.firstname} {char.lastname}
              </p>
              <p className="character-age">{char.age} ans</p>
              {char.isPlayer && (
                <span className="character-badge player-badge">Joueur</span>
              )}
              {!char.isPlayer && (
                <span className="character-badge npc-badge">PNJ</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CharactersPage;
