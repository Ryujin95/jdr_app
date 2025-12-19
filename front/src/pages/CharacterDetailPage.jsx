import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/CharacterDetail.css";

function CharacterDetailPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const res = await fetch(`${API_URL}/characters/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Erreur HTTP ${res.status}`);
        }

        const data = await res.json();
        setCharacter(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCharacter();
    }
  }, [id, token, token]);

  if (!token) {
    return <p style={{ padding: "2rem" }}>Connecte-toi pour voir les personnages.</p>;
  }

  if (loading) {
    return <p style={{ padding: "2rem" }}>Chargement du personnage...</p>;
  }

  if (error) {
    return (
      <p style={{ padding: "2rem", color: "red" }}>
        Erreur : {error}
      </p>
    );
  }

  if (!character) {
    return <p style={{ padding: "2rem" }}>Personnage introuvable.</p>;
  }

  const fullName = `${character.firstname} ${character.lastname}`;

  return (
    <div
      className="character-detail-page"
      style={
        character.avatarUrl
          ? { backgroundImage: `url(${character.avatarUrl})` }
          : undefined
      }
    >
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Retour
      </button>

      <div className="character-detail-card">
        <div className="detail-header">
          <div className="detail-header-info">
            <h1>{character.nickname}</h1>
            <p className="detail-name">{fullName}</p>
            <p className="detail-age">{character.age} ans</p>
            <p className="detail-type">
              {character.isPlayer ? "Personnage joueur" : "Personnage non joueur"}
            </p>
          </div>
        </div>

        {character.biography && (
          <section className="detail-section">
            <h2>Histoire</h2>
            <p>{character.biography}</p>
          </section>
        )}

        {character.strengths && (
          <section className="detail-section">
            <h2>Points forts</h2>
            <p>{character.strengths}</p>
          </section>
        )}

        {character.weaknesses && (
          <section className="detail-section">
            <h2>Faiblesses</h2>
            <p>{character.weaknesses}</p>
          </section>
        )}

        {character.attributes && (
          <section className="detail-section">
            <h2>Attributs</h2>
            <div className="attributes-grid">
              <div className="attribute-item">
                <span>Force</span>
                <strong>{character.attributes.strength}</strong>
              </div>
              <div className="attribute-item">
                <span>Agilité</span>
                <strong>{character.attributes.agility}</strong>
              </div>
              <div className="attribute-item">
                <span>Esprit</span>
                <strong>{character.attributes.wits}</strong>
              </div>
              <div className="attribute-item">
                <span>Empathie</span>
                <strong>{character.attributes.empathy}</strong>
              </div>
            </div>
          </section>
        )}

        {character.skills && character.skills.length > 0 && (
          <section className="detail-section">
            <h2>Compétences</h2>
            <ul className="skills-list">
              {character.skills.map((skill) => (
                <li key={skill.id} className="skill-item">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-attr">[{skill.parentAttribute}]</span>
                  <span className="skill-level">Niveau {skill.level}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default CharacterDetailPage;
