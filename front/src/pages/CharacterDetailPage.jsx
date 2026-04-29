// src/pages/CharacterDetailPage.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import { apiGetCharacter } from "../api/api";
import "../CSS/CharacterDetail.css";

function CharacterDetailPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = API_URL.replace(/\/api\/?$/, "");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGetCharacter(token, id);
        if (cancelled) return;
        setCharacter(data);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCharacter();
    return () => { cancelled = true; };
  }, [id, token]);

  const buildBackgroundUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("http")) return avatarUrl;
    if (avatarUrl.startsWith("/")) return `${BASE_URL}${avatarUrl}`;
    return `${BASE_URL}/${avatarUrl}`;
  };

  if (!token) return <p className="detail-notice">Connecte-toi pour voir les personnages.</p>;
  if (loading) return <p className="detail-notice">Chargement du personnage...</p>;
  if (error) return <p className="detail-notice detail-notice--error">Erreur : {error}</p>;
  if (!character) return <p className="detail-notice">Personnage introuvable.</p>;

  const fullName = `${character.firstname} ${character.lastname}`;
  const backgroundUrl = buildBackgroundUrl(character.avatarUrl);

  return (
    <div
      className="character-detail-page"
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
    >
      <button className="back-button" onClick={() => navigate(-1)}>← Retour</button>

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

        {character.secret && (
          <section className="detail-section">
            <h2>Secret</h2>
            <p>{character.secret}</p>
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

        {character.skills?.length > 0 && (
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