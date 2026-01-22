// src/pages/CampaignCharactersPage.jsx
import { useEffect, useState, useContext, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/CampaignPage.css"; // ✅ AJOUT: demandé (même si c'est pas le CSS principal de cette page)
import "../CSS/Characters.css";

function CampaignCharactersPage() {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id: campaignIdParam } = useParams();

  // ✅ on prend campaignId depuis Outlet en priorité (source de vérité), sinon fallback sur l'URL
  const outlet = useOutletContext() || {};
  const campaignIdFromOutlet = outlet.campaignId ? Number(outlet.campaignId) : null;
  const campaignId = Number.isFinite(campaignIdFromOutlet)
    ? campaignIdFromOutlet
    : Number(campaignIdParam);

  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ on sépare l’erreur de chargement des persos (bloquante) et les erreurs d’actions (non bloquantes)
  const [loadError, setLoadError] = useState(null);
  const [uiError, setUiError] = useState(null);

  const [openPanelId, setOpenPanelId] = useState(null);
  const [knownMap, setKnownMap] = useState({});
  const clickTimeoutRef = useRef(null);

  const [showAddModalFor, setShowAddModalFor] = useState(null);
  const [candidateMap, setCandidateMap] = useState({});
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedRelationType, setSelectedRelationType] = useState("neutral");

  const [hoverStarsKey, setHoverStarsKey] = useState(null);
  const [hoverStarsValue, setHoverStarsValue] = useState(0);

  const isOwnerInThisCampaign = !!outlet.isMjInThisCampaign;
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ROLE_ADMIN");
  const isAdminOrOwner = isAdmin || isOwnerInThisCampaign;

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

  const formatRelationType = (t) => {
    const v = String(t || "").trim().toLowerCase();
    if (v === "ami" || v === "friend") return "Ami";
    if (v === "ennemi" || v === "enemy") return "Ennemi";
    if (v === "neutre" || v === "neutral" || v === "") return "Neutre";
    return v.charAt(0).toUpperCase() + v.slice(1);
  };

  const normalizeTypeForApi = (t) => {
    const v = String(t || "").trim().toLowerCase();
    if (v === "ami") return "ami";
    if (v === "ennemi") return "ennemi";
    return "neutral";
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

  const qs = useMemo(() => {
    return campaignId ? `?campaignId=${encodeURIComponent(String(campaignId))}` : "";
  }, [campaignId]);

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setUiError(null);

      if (!campaignId) throw new Error("Campagne invalide.");

      // ✅ MODIF: AbortController pour éviter setState si l’utilisateur change d’onglet vite
      const controller = new AbortController();
      const { signal } = controller;

      const res = await fetch(`${API_URL}/characters${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => []);
      setCharacters(Array.isArray(data) ? data : []);

      return () => controller.abort();
    } catch (e) {
      if (e?.name === "AbortError") return;
      setLoadError(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [token, qs, campaignId]);

  useEffect(() => {
    if (token && campaignId) {
      const cleanupPromise = fetchCharacters();
      return () => {
        if (typeof cleanupPromise === "function") cleanupPromise();
      };
    }
  }, [token, campaignId, fetchCharacters]);

  const assertCanUseMjEndpoints = useCallback(() => {
    if (!isAdminOrOwner) {
      const err = new Error("Accès refusé: campaign owner only");
      err.status = 403;
      throw err;
    }
  }, [isAdminOrOwner]);

  const fetchKnownFor = useCallback(
    async (fromId) => {
      assertCanUseMjEndpoints();

      const res = await fetch(`${API_URL}/mj/characters/${fromId}/known${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    },
    [token, qs, assertCanUseMjEndpoints]
  );

  const fetchCandidatesFor = useCallback(
    async (fromId) => {
      assertCanUseMjEndpoints();

      const res = await fetch(`${API_URL}/mj/characters/${fromId}/candidates${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    },
    [token, qs, assertCanUseMjEndpoints]
  );

  const addKnownCharacter = useCallback(
    async (fromId, toId, type) => {
      assertCanUseMjEndpoints();

      const res = await fetch(`${API_URL}/mj/characters/${fromId}/known${qs}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toCharacterId: toId, type }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      await res.json().catch(() => null);
    },
    [token, qs, assertCanUseMjEndpoints]
  );

  const removeKnownCharacter = useCallback(
    async (fromId, toId) => {
      assertCanUseMjEndpoints();

      // ✅ MODIF IMPORTANT: ta route console = /api/mj/characters/{fromId}/known/{toId}
      // Là tu avais /known/${toId} mais dans certains essais tu avais aussi une variante.
      // Je force le format EXACT de ton debug:router.
      const res = await fetch(`${API_URL}/mj/characters/${fromId}/known/${toId}${qs}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      await res.json().catch(() => null);
    },
    [token, qs, assertCanUseMjEndpoints]
  );

  const updateRelationshipStars = useCallback(
    async (fromId, toId, stars) => {
      assertCanUseMjEndpoints();

      setKnownMap((prev) => {
        const current = Array.isArray(prev[fromId]) ? prev[fromId] : [];
        return {
          ...prev,
          [fromId]: current.map((c) =>
            c.id === toId ? { ...c, relationshipStars: stars, affinityScore: stars * 20 } : c
          ),
        };
      });

      try {
        const res = await fetch(`${API_URL}/mj/relationships${qs}`, {
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
        try {
          const known = await fetchKnownFor(fromId);
          setKnownMap((prev) => ({ ...prev, [fromId]: known }));
        } catch {
          // ignore
        }
        throw e;
      }
    },
    [token, qs, fetchKnownFor, assertCanUseMjEndpoints]
  );

  const handleCardSingleClick = useCallback(
    (charId) => {
      if (!isAdminOrOwner) {
        navigate(`/transition-video/${charId}`);
        return;
      }

      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

      clickTimeoutRef.current = setTimeout(async () => {
        if (openPanelId === charId) {
          setOpenPanelId(null);
          return;
        }

        setOpenPanelId(charId);

        try {
          setUiError(null);

          if (Array.isArray(knownMap[charId])) return;

          const known = await fetchKnownFor(charId);
          setKnownMap((prev) => ({ ...prev, [charId]: known }));
        } catch (e) {
          setKnownMap((prev) => ({ ...prev, [charId]: [] }));
          setUiError(e.message || "Erreur lors du chargement des relations.");
        }
      }, 220);
    },
    [isAdminOrOwner, navigate, openPanelId, fetchKnownFor, knownMap]
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

    if (!isAdminOrOwner) {
      setUiError("Action refusée: seul le owner (ou admin) peut envoyer à la corbeille.");
      return;
    }

    const confirmDelete = window.confirm("Envoyer ce personnage dans la corbeille ?");
    if (!confirmDelete) return;

    try {
      setUiError(null);

      const res = await fetch(`${API_URL}/trash/move/character/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ campaignId }),
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) throw new Error(text || `Erreur HTTP ${res.status}`);

      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setOpenPanelId((prev) => (prev === id ? null : prev));
    } catch (e) {
      setUiError(e.message || "Erreur lors de l'envoi dans la corbeille.");
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
      if (!isAdminOrOwner) return;

      try {
        setUiError(null);
        setSelectedCandidateId("");
        setSelectedRelationType("neutral");
        setShowAddModalFor(fromId);

        const candidates = await fetchCandidatesFor(fromId);
        setCandidateMap((prev) => ({ ...prev, [fromId]: candidates }));
      } catch (e) {
        setUiError(e.message || "Erreur lors du chargement des personnages ajoutables.");
        setShowAddModalFor(null);
      }
    },
    [fetchCandidatesFor, isAdminOrOwner]
  );

  const confirmAddKnown = useCallback(async () => {
    try {
      if (!showAddModalFor) return;

      const fromId = showAddModalFor;
      const toId = Number(selectedCandidateId);
      if (!toId) return;

      setUiError(null);

      const type = normalizeTypeForApi(selectedRelationType);
      await addKnownCharacter(fromId, toId, type);

      const known = await fetchKnownFor(fromId);
      setKnownMap((prev) => ({ ...prev, [fromId]: known }));

      const candidates = await fetchCandidatesFor(fromId);
      setCandidateMap((prev) => ({ ...prev, [fromId]: candidates }));

      setShowAddModalFor(null);
      setSelectedCandidateId("");
      setSelectedRelationType("neutral");
    } catch (e) {
      setUiError(e.message || "Erreur lors de l'ajout du connu.");
    }
  }, [
    showAddModalFor,
    selectedCandidateId,
    selectedRelationType,
    addKnownCharacter,
    fetchKnownFor,
    fetchCandidatesFor,
  ]);

  const confirmRemoveKnown = useCallback(
    async (fromId, toId) => {
      const ok = window.confirm("Supprimer cette connaissance ?");
      if (!ok) return;

      try {
        setUiError(null);

        setKnownMap((prev) => {
          const current = Array.isArray(prev[fromId]) ? prev[fromId] : [];
          return { ...prev, [fromId]: current.filter((k) => k.id !== toId) };
        });

        await removeKnownCharacter(fromId, toId);

        const candidates = await fetchCandidatesFor(fromId);
        setCandidateMap((prev) => ({ ...prev, [fromId]: candidates }));
      } catch (e) {
        setUiError(e.message || "Erreur lors de la suppression du connu.");

        try {
          const known = await fetchKnownFor(fromId);
          setKnownMap((prev) => ({ ...prev, [fromId]: known }));
        } catch {
          // ignore
        }
      }
    },
    [removeKnownCharacter, fetchCandidatesFor, fetchKnownFor]
  );

  if (!token) return <p style={{ padding: "2rem" }}>Connecte-toi pour voir les personnages.</p>;
  if (loading) return <p style={{ padding: "2rem" }}>Chargement des personnages...</p>;
  if (loadError)
    return (
      <p style={{ padding: "2rem", color: "red" }}>
        Erreur lors du chargement : {loadError}
      </p>
    );
  if (characters.length === 0) return <p style={{ padding: "2rem" }}>Aucun personnage pour l’instant.</p>;

  return (
    <div className="characters-page">
      <h1>Personnages</h1>

      {uiError && <p style={{ padding: "0 0 1rem 0", color: "red" }}>{uiError}</p>}

      {charactersByClan.map(([clanName, clanCharacters]) => (
        <section key={clanName} className="clan-section">
          <h2 className="clan-title">{clanName}</h2>

          <div className="characters-grid">
            {clanCharacters.map((char) => {
              const avatarSrc = resolveAvatarUrl(char.avatarUrl);

              const ownerLabel =
                char.owner?.username ||
                char.owner?.email ||
                (char.owner?.id ? `User #${char.owner.id}` : null);

              const panelOpen = isAdminOrOwner && openPanelId === char.id;
              const knownList = panelOpen ? knownMap[char.id] : null;

              return (
                <div
                  key={char.id}
                  className={`character-card ${panelOpen ? "open" : ""}`}
                  onClick={() => handleCardSingleClick(char.id)}
                  onDoubleClick={() => handleCardDoubleClick(char.id)}
                >
                  <div className="character-card-top">
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

                      {!isAdminOrOwner && renderStarsReadOnly(char.relationshipStars)}
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

                      {isAdminOrOwner && (
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
                    <div className="relationship-panel inside" onClick={(e) => e.stopPropagation()}>
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

                                  <div className="mini-row">
                                    <StarsEditor
                                      value={known.relationshipStars}
                                      hoverKey={key}
                                      onChange={(stars) =>
                                        updateRelationshipStars(char.id, known.id, stars).catch((e) =>
                                          setUiError(e.message || "Erreur relation.")
                                        )
                                      }
                                    />

                                    <button
                                      type="button"
                                      className="mini-remove-button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        confirmRemoveKnown(char.id, known.id);
                                      }}
                                      title="Supprimer ce connu"
                                    >
                                      ✕
                                    </button>
                                  </div>
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

      {isAdminOrOwner && showAddModalFor && (
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

            <select
              className="modal-select"
              value={selectedRelationType}
              onChange={(e) => setSelectedRelationType(e.target.value)}
            >
              <option value="neutral">Neutre</option>
              <option value="ami">Ami</option>
              <option value="ennemi">Ennemi</option>
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

export default CampaignCharactersPage;
