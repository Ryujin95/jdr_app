// src/pages/CharacterDetailPage.jsx
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import { apiGetCharacter } from "../api/api";
import "../CSS/CharacterDetail.css";

function CharacterDetailPage() {
  const { id } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
        setError(e?.message || t("common.error"));
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

  if (!token) return <p className="detail-notice">{t("characterDetail.notLoggedIn")}</p>;
  if (loading) return <p className="detail-notice">{t("characterDetail.loading")}</p>;
  if (error) return <p className="detail-notice detail-notice--error">{t("common.error")} : {error}</p>;
  if (!character) return <p className="detail-notice">{t("characterDetail.notFound")}</p>;

  const fullName = `${character.firstname} ${character.lastname}`;
  const backgroundUrl = buildBackgroundUrl(character.avatarUrl);

  return (
    <div
      className="character-detail-page"
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
    >
      <button className="back-button" onClick={() => navigate(-1)}>
        {t("characterDetail.back")}
      </button>

      <div className="character-detail-card">
        <div className="detail-header">
          <div className="detail-header-info">
            <h1>{character.nickname}</h1>
            <p className="detail-name">{fullName}</p>
            <p className="detail-age">{character.age} {t("characterDetail.age")}</p>
            <p className="detail-type">
              {character.isPlayer ? t("characterDetail.player") : t("characterDetail.npc")}
            </p>
          </div>
        </div>

        {character.biography && (
          <section className="detail-section">
            <h2>{t("characterDetail.biography")}</h2>
            <p>{character.biography}</p>
          </section>
        )}

        {character.strengths && (
          <section className="detail-section">
            <h2>{t("characterDetail.strengths")}</h2>
            <p>{character.strengths}</p>
          </section>
        )}

        {character.weaknesses && (
          <section className="detail-section">
            <h2>{t("characterDetail.weaknesses")}</h2>
            <p>{character.weaknesses}</p>
          </section>
        )}

        {character.secret && (
          <section className="detail-section">
            <h2>{t("characterDetail.secret")}</h2>
            <p>{character.secret}</p>
          </section>
        )}

        {character.attributes && (
          <section className="detail-section">
            <h2>{t("characterDetail.attributes")}</h2>
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
            <h2>{t("characterDetail.skills")}</h2>
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