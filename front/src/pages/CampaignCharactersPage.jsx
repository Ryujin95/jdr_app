// src/pages/CampaignCharactersPage.jsx
import { useEffect, useState, useContext, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";
import "../CSS/CampaignPage.css"; // ✅ AJOUT: demandé (même si c'est pas le CSS principal de cette page)
import "../CSS/Characters.css";

function CampaignCharactersPage() {
  const { token, user } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);
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

  // ✅ NOUVEAU: modal création perso (sur la page)
  const [createOpen, setCreateOpen] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState(null);

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

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

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
            relationshipStars: stars,
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
      addNotification?.({ type: "error", message: "Action refusée." });
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
      addNotification?.({ type: "success", message: "Personnage envoyé à la corbeille." });
    } catch (e) {
      const msg = e.message || "Erreur lors de l'envoi dans la corbeille.";
      setUiError(msg);
      addNotification?.({ type: "error", message: msg });
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

      addNotification?.({ type: "success", message: "Connu ajouté." });
    } catch (e) {
      const msg = e.message || "Erreur lors de l'ajout du connu.";
      setUiError(msg);
      addNotification?.({ type: "error", message: msg });
    }
  }, [
    showAddModalFor,
    selectedCandidateId,
    selectedRelationType,
    addKnownCharacter,
    fetchKnownFor,
    fetchCandidatesFor,
    addNotification,
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

        addNotification?.({ type: "success", message: "Connu supprimé." });
      } catch (e) {
        const msg = e.message || "Erreur lors de la suppression du connu.";
        setUiError(msg);
        addNotification?.({ type: "error", message: msg });

        try {
          const known = await fetchKnownFor(fromId);
          setKnownMap((prev) => ({ ...prev, [fromId]: known }));
        } catch {
          // ignore
        }
      }
    },
    [removeKnownCharacter, fetchCandidatesFor, fetchKnownFor, addNotification]
  );

  // ✅ NOUVEAU: gestion preview + cleanup
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;

    if (!file || !(file instanceof File) || file.size === 0) {
      setAvatarFile(null);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      return;
    }

    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const resetCreateForm = () => {
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
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setCreateError(null);
  };

  const openCreateModal = () => {
    if (!isAdminOrOwner) {
      addNotification?.({ type: "error", message: "Seul le MJ (ou admin) peut créer un personnage." });
      return;
    }
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateError(null);
  };

  // ✅ NOUVEAU: lock scroll page (plus de scroll “windows 95” à droite)
  useEffect(() => {
    if (!createOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeCreateModal();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow || "";
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  const submitCreateCharacter = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!campaignId) {
      const msg = "Campagne invalide.";
      setCreateError(msg);
      addNotification?.({ type: "error", message: msg });
      return;
    }

    if (!nickname.trim()) {
      const msg = "Le surnom est obligatoire.";
      setCreateError(msg);
      addNotification?.({ type: "error", message: msg });
      return;
    }

    setSubmittingCreate(true);

    try {
      const formData = new FormData();
      formData.append("campaignId", String(campaignId));
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

      if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/characters`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Erreur création personnage (HTTP ${res.status})`);
      }

      await res.json().catch(() => null);

      addNotification?.({ type: "success", message: "Personnage créé." });
      resetCreateForm();
      setCreateOpen(false);

      await fetchCharacters();
    } catch (err) {
      const raw = err?.message || "";
      const msg = raw || "Impossible de créer le personnage.";
      setCreateError(msg);
      addNotification?.({ type: "error", message: msg });
    } finally {
      setSubmittingCreate(false);
    }
  };

  if (!token) return <p style={{ padding: "2rem" }}>Connecte-toi pour voir les personnages.</p>;
  if (loading) return <p style={{ padding: "2rem" }}>Chargement des personnages...</p>;
  if (loadError)
    return (
      <p style={{ padding: "2rem", color: "red" }}>
        Erreur lors du chargement : {loadError}
      </p>
    );

  return (
    <div className="characters-page">
      {/* ✅ NOUVEAU: hide scrollbar du modal sans toucher aux fichiers CSS */}
      <style>{`
        .character-create-modal {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .character-create-modal::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          display: none;
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Personnages</h1>

        {isAdminOrOwner && (
          <button
            type="button"
            className="relationship-add-button"
            onClick={openCreateModal}
            title="Créer un personnage"
          >
            + Créer
          </button>
        )}
      </div>

      {uiError && <p style={{ padding: "0 0 1rem 0", color: "red" }}>{uiError}</p>}

      {characters.length === 0 ? (
        <p style={{ padding: "2rem" }}>Aucun personnage pour l’instant.</p>
      ) : (
        charactersByClan.map(([clanName, clanCharacters]) => (
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
                                          updateRelationshipStars(char.id, known.id, stars).catch((e) => {
                                            const msg = e.message || "Erreur relation.";
                                            setUiError(msg);
                                            addNotification?.({ type: "error", message: msg });
                                          })
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
        ))
      )}

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

      {/* ✅ NOUVEAU: modal création perso (sans changer de page) */}
      {isAdminOrOwner && createOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!submittingCreate) closeCreateModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
          }}
        >
          <div
            className="modal character-create-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(980px, calc(100vw - 32px))",
              maxHeight: "calc(100vh - 40px)",
              overflowY: "auto",
            }}
          >
            <div className="modal-title" style={{ fontSize: 22 }}>
              Créer un personnage
            </div>

            {createError && (
              <p style={{ margin: "10px 0 0 0", color: "red" }}>{createError}</p>
            )}

            <form className="character-form" onSubmit={submitCreateCharacter}>
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
                    <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
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
                    <input type="checkbox" checked={isPlayer} onChange={(e) => setIsPlayer(e.target.checked)} />
                    Personnage joueur
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
                  onClick={() => {
                    if (submittingCreate) return;
                    closeCreateModal();
                  }}
                  disabled={submittingCreate}
                >
                  Annuler
                </button>

                <button type="submit" className="primary-button" disabled={submittingCreate}>
                  {submittingCreate ? "Enregistrement..." : "Créer le personnage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignCharactersPage;