import { useEffect, useState, useContext, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/Characters.css";

function CharactersPage() {
  const { token, user } = useContext(AuthContext);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openPanelId, setOpenPanelId] = useState(null);
  const [knownMap, setKnownMap] = useState({});
  const clickTimeoutRef = useRef(null);

  const [showAddModalFor, setShowAddModalFor] = useState(null);
  const [candidateMap, setCandidateMap] = useState({});
  const [selectedCandidateId, setSelectedCandidateId] = useState("");

  const [hoverStarsKey, setHoverStarsKey] = useState(null);
  const [hoverStarsValue, setHoverStarsValue] = useState(0);

  const navigate = useNavigate();

  const isAdminOrMj =
    Array.isArray(user?.roles) &&
    (user.roles.includes("ROLE_ADMIN") || user.roles.includes("ROLE_MJ"));

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

  const renderStarsReadOnly = (value) => {
    if (value === null || value === undefined) return null;

    const v = Math.max(0, Math.min(5, Number(value) || 0));
    const full = "★".repeat(v);
    const empty = "☆".repeat(5 - v);

    return (
      <div className="relationship-stars readonly" aria-label={`${v} sur 5`}>
        {full}
        {empty}
      </div>
    );
  };

  const StarsEditor = ({ value, onChange, hoverKey }) => {
    const saved = Math.max(0, Math.min(5, Number(value) || 0));
    const showing = hoverStarsKey === hoverKey ? hoverStarsValue : saved;

    return (
      <div
        className="relationship-stars editor compact"
        onMouseLeave={() => {
          setHoverStarsKey(null);
          setHoverStarsValue(0);
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`star ${i <= showing ? "full" : "empty"}`}
            onMouseEnter={(e) => {
              e.stopPropagation();
              setHoverStarsKey(hoverKey);
              setHoverStarsValue(i);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onChange(i);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange(i);
              }
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/characters`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const fetchKnownFor = useCallback(
    async (fromId) => {
      const res = await fetch(`${API_URL}/mj/characters/${fromId}/known`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    [token]
  );

  const fetchCandidatesFor = useCallback(
    async (fromId) => {
      const res = await fetch(`${API_URL}/mj/characters/${fromId}/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    [token]
  );

  const addKnownCharacter = useCallback(
    async (fromId, toId) => {
      const res = await fetch(`${API_URL}/mj/characters/${fromId}/known`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toCharacterId: toId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      await res.json().catch(() => null);
    },
    [token]
  );

  const updateRelationshipStars = useCallback(
    async (fromId, toId, stars) => {
      setKnownMap((prev) => {
        const current = Array.isArray(prev[fromId]) ? prev[fromId] : [];
        return {
          ...prev,
          [fromId]: current.map((c) =>
            c.id === toId
              ? { ...c, relationshipStars: stars, affinityScore: stars * 20 }
              : c
          ),
        };
      });

      try {
        setError(null);

        const res = await fetch(`${API_URL}/mj/relationships`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromCharacterId: fromId,
            toCharacterId: toId,
            stars,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Erreur HTTP ${res.status}`);
        }

        const updated = await res.json().catch(() => null);

        if (updated && typeof updated.relationshipStars === "number") {
          setKnownMap((prev) => {
            const current = Array.isArray(prev[fromId]) ? prev[fromId] : [];
            return {
              ...prev,
              [fromId]: current.map((c) =>
                c.id === toId
                  ? {
                      ...c,
                      relationshipStars: updated.relationshipStars,
                      affinityScore: updated.affinityScore,
                    }
                  : c
              ),
            };
          });
        }
      } catch (e) {
        setError(e.message || "Erreur lors de la mise à jour de la relation.");
      }
    },
    [token]
  );

  const handleCardSingleClick = useCallback(
    (charId) => {
      if (!isAdminOrMj) {
        navigate(`/transition-video/${charId}`);
        return;
      }

      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

      clickTimeoutRef.current = setTimeout(async () => {
        try {
          setError(null);

          if (openPanelId === charId) {
            setOpenPanelId(null);
            return;
          }

          setOpenPanelId(charId);

          const known = await fetchKnownFor(charId);
          setKnownMap((prev) => ({ ...prev, [charId]: known }));
        } catch (e) {
          setError(e.message || "Erreur lors du chargement des relations.");
        }
      }, 220);
    },
    [isAdminOrMj, navigate, openPanelId, fetchKnownFor]
  );

  const handleCardDoubleClick = useCallback(
    (charId) => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      navigate(`/transition-video/${charId}`);
    },
    [navigate]
  );

  const handleEditClick = (event, id) => {
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Impossible d'envoyer ce personnage dans la corbeille.");
      }

      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setOpenPanelId((prev) => (prev === id ? null : prev));
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

  const openAddKnownModal = useCallback(
    async (fromId) => {
      try {
        setError(null);
        setSelectedCandidateId("");
        setShowAddModalFor(fromId);

        const candidates = await fetchCandidatesFor(fromId);
        setCandidateMap((prev) => ({ ...prev, [fromId]: candidates }));
      } catch (e) {
        setError(e.message || "Erreur lors du chargement des personnages ajoutables.");
        setShowAddModalFor(null);
      }
    },
    [fetchCandidatesFor]
  );

  const formatRelationType = (t) => {
    const v = String(t || "").trim().toLowerCase();
    if (v === "ami" || v === "friend") return "Ami";
    if (v === "ennemi" || v === "enemy") return "Ennemi";
    if (v === "neutre" || v === "neutral" || v === "") return "Neutre";
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  const confirmAddKnown = useCallback(async () => {
    try {
      if (!showAddModalFor) return;
      const fromId = showAddModalFor;
      const toId = Number(selectedCandidateId);
      if (!toId) return;

      setError(null);

      await addKnownCharacter(fromId, toId);

      const known = await fetchKnownFor(fromId);
      setKnownMap((prev) => ({ ...prev, [fromId]: known }));

      const candidates = await fetchCandidatesFor(fromId);
      setCandidateMap((prev) => ({ ...prev, [fromId]: candidates }));

      setShowAddModalFor(null);
      setSelectedCandidateId("");
    } catch (e) {
      setError(e.message || "Erreur lors de l'ajout du connu.");
    }
  }, [showAddModalFor, selectedCandidateId, addKnownCharacter, fetchKnownFor, fetchCandidatesFor]);

  if (!token) return <p style={{ padding: "2rem" }}>Connecte-toi pour voir les personnages.</p>;
  if (loading) return <p style={{ padding: "2rem" }}>Chargement des personnages...</p>;
  if (error) return <p style={{ padding: "2rem", color: "red" }}>Erreur lors du chargement : {error}</p>;
  if (characters.length === 0) return <p style={{ padding: "2rem" }}>Aucun personnage pour l’instant.</p>;

  return (
    <div className="characters-page">
      <h1>Personnages du JDR</h1>

      {charactersByClan.map(([clanName, clanCharacters]) => (
        <section key={clanName} className="clan-section">
          <h2 className="clan-title">{clanName}</h2>

          <div className="characters-grid">
            {clanCharacters.map((char) => {
              const avatarSrc = resolveAvatarUrl(char.avatarUrl);

              // ✅ RESTAURÉ: label owner à côté de Joueur
              const ownerLabel =
                char.owner?.username ||
                char.owner?.email ||
                (char.owner?.id ? `User #${char.owner.id}` : null);

              const panelOpen = isAdminOrMj && openPanelId === char.id;
              const knownList = panelOpen ? knownMap[char.id] : null;

              return (
                <div key={char.id} className="character-card-wrapper">
                  <div
                    className="character-card"
                    onClick={() => handleCardSingleClick(char.id)}
                    onDoubleClick={() => handleCardDoubleClick(char.id)}
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

                      {!isAdminOrMj && renderStarsReadOnly(char.relationshipStars)}
                    </div>

                    <div className="character-info">
                      <h3 className="character-nickname">{char.nickname}</h3>

                      <p className="character-name">
                        {char.firstname} {char.lastname}
                      </p>

                      <p className="character-age">{char.age} ans</p>

                      {char.isPlayer ? (
                        <span className="character-badge player-badge">
                          Joueur{ownerLabel ? ` · ${ownerLabel}` : ""}
                        </span>
                      ) : (
                        <span className="character-badge npc-badge">PNJ</span>
                      )}

                      {isAdminOrMj && (
                        <div className="character-actions">
                          <button
                            type="button"
                            className="character-edit-button"
                            onClick={(event) => handleEditClick(event, char.id)}
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

                  {panelOpen && (
                    <div className="relationship-panel" onClick={(e) => e.stopPropagation()}>
                      <div className="relationship-panel-header">
                        <div className="relationship-panel-title">Relations</div>

                        <button
                          type="button"
                          className="relationship-add-button"
                          onClick={() => openAddKnownModal(char.id)}
                        >
                          Ajouter un connu
                        </button>
                      </div>

                      {!Array.isArray(knownList) ? (
                        <p style={{ margin: 0, opacity: 0.8 }}>Chargement...</p>
                      ) : knownList.length === 0 ? (
                        <p style={{ margin: 0, opacity: 0.8 }}>
                          Aucun personnage connu pour l’instant.
                        </p>
                      ) : (
                        <div className="relationship-mini-grid">
                          {knownList.map((known) => {
                            const kAvatar = resolveAvatarUrl(known.avatarUrl);
                            const key = `${char.id}-${known.id}`;

                            return (
                              <div key={known.id} className="mini-character-card compact">
                                {kAvatar ? (
                                  <img
                                    src={kAvatar}
                                    alt={known.nickname}
                                    className="mini-avatar compact"
                                  />
                                ) : (
                                  <div className="mini-avatar compact placeholder">
                                    {known.nickname?.charAt(0) || "?"}
                                  </div>
                                )}

                                <div className="mini-info compact">
                                <div className="mini-title compact">
                                  {known.nickname}
                                  <span className="mini-type"> · {formatRelationType(known.type)}</span>
                                </div>
                                  <StarsEditor
                                    value={known.relationshipStars}
                                    hoverKey={key}
                                    onChange={(stars) =>
                                      updateRelationshipStars(char.id, known.id, stars)
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {isAdminOrMj && showAddModalFor && (
        <div className="modal-overlay" onClick={() => setShowAddModalFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Ajouter un connu</div>

            <select
              className="modal-select"
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
            >
              <option value="">Choisir un personnage</option>
              {(candidateMap[showAddModalFor] || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname} {c.clan ? `(${c.clan})` : ""}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button type="button" className="modal-cancel" onClick={() => setShowAddModalFor(null)}>
                Annuler
              </button>

              <button
                type="button"
                className="modal-confirm"
                disabled={!selectedCandidateId}
                onClick={confirmAddKnown}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CharactersPage;
