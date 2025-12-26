// src/pages/LocationCharactersPage.jsx
import { useEffect, useState, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/LocationCharacters.css";

function LocationCharactersPage() {
  const { locationId } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const assetBase = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const buildAssetUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${assetBase}${path}`;
    return `${assetBase}/${path}`;
  };

  useEffect(() => {
    const fetchCharacters = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/locations/${locationId}/characters`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Erreur HTTP ${res.status}`);
        }

        const data = await res.json();
        setCharacters(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
        setCharacters([]);
      } finally {
        setLoading(false);
      }
    };

    if (token && locationId) fetchCharacters();
  }, [token, locationId]);

  if (!token) {
    return (
      <div className="location-characters-page">
        <p className="location-characters-message">
          Connecte-toi pour voir les personnages.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="location-characters-page">
        <p className="location-characters-message">
          Chargement des personnages…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="location-characters-page">
        <p className="location-characters-message location-characters-error">
          Erreur : {error}
        </p>
      </div>
    );
  }

  return (
    <div className="location-characters-page">
      <button className="location-characters-back" onClick={() => navigate(-1)}>
        ← Retour
      </button>

      <h1 className="location-characters-title">Personnages dans ce lieu</h1>

      {characters.length === 0 ? (
        <p className="location-characters-message">Aucun personnage dans ce lieu.</p>
      ) : (
        <div className="location-characters-grid">
          {characters.map((c) => {
            const avatar = buildAssetUrl(c.avatarUrl);

            return (
              <div
                key={c.id}
                className="location-characters-card"
                onClick={() => navigate(`/characters/${c.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className="location-characters-card-header">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={c.nickname}
                      className="location-characters-avatar"
                    />
                  ) : (
                    <div className="location-characters-avatar location-characters-avatar-placeholder" />
                  )}

                  <div>
                    <h2 className="location-characters-nickname">{c.nickname}</h2>
                    <p className="location-characters-name">
                      {c.firstname} {c.lastname}
                    </p>
                    <p className="location-characters-meta">
                      {c.age} ans · {c.clan || "Sans clan"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LocationCharactersPage;
