// src/pages/characters/CampaignCharactersPage.jsx
import { useEffect, useContext, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { NotificationContext } from "../../context/NotificationContext";
import { useCharacters } from "./hooks/useCharacters";
import { useCharacterRelations } from "./hooks/useCharacterRelations";
import CharacterCard from "./components/CharacterCard";
import AddKnownModal from "./components/AddKnownModal";
import CampaignEditorPage from "../CampaignEditorPage";
import { groupCharactersByClan } from "./utils/groupCharactersByClan";
import { formatRelationType, normalizeTypeForApi } from "./utils/relationFormatters";
import { API_URL } from "../../config";
import "../../CSS/CampaignPage.css";
import "../../CSS/Characters.css";

function CampaignCharactersPage() {
  const { token, user } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);

  const navigate = useNavigate();
  const { id: campaignIdParam } = useParams();
  const outlet = useOutletContext() || {};

  const campaignId = outlet.campaignId ? Number(outlet.campaignId) : Number(campaignIdParam);

  const isOwner = !!outlet.isMjInThisCampaign;
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ROLE_ADMIN");
  const isAdminOrOwner = isAdmin || isOwner;

  const { characters, loading, loadError, load, sendToTrash } = useCharacters(token, campaignId);

  const {
    knownMap,
    candidateMap,
    openPanelId,
    setOpenPanelId,
    loadKnown,
    loadCandidates,
    handleAddKnown,
    handleRemoveKnown,
    handleUpdateStars,
  } = useCharacterRelations(token, campaignId, isAdminOrOwner );

  const [showAddFor, setShowAddFor] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedRelationType, setSelectedRelationType] = useState("neutral");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (token && campaignId) load();
  }, [token, campaignId, load]);

  const charactersByClan = useMemo(() => groupCharactersByClan(characters), [characters]);

  const BACK_BASE_URL = API_URL.replace(/\/api\/?$/, "");
  const resolveAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    const url = String(avatarUrl).trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${BACK_BASE_URL}${url}`;
    return `${BACK_BASE_URL}/${url}`;
  };

  const handleOpenCard = async (charId) => {
    if (!isAdminOrOwner) {
      navigate(`/transition-video/${charId}`);
      return;
    }

    if (openPanelId === charId) {
      setOpenPanelId(null);
      return;
    }

    setOpenPanelId(charId);

    if (!knownMap[charId]) {
      await loadKnown(charId);
    }
  };

  const handleAddKnownConfirm = async () => {
    if (!showAddFor || !selectedCandidateId) return;

    try {
      await handleAddKnown(showAddFor, Number(selectedCandidateId), normalizeTypeForApi(selectedRelationType));
      addNotification?.({ type: "success", message: "Relation ajoutée." });

      setShowAddFor(null);
      setSelectedCandidateId("");
      setSelectedRelationType("neutral");
    } catch (e) {
      addNotification?.({ type: "error", message: e?.message || "Erreur relation." });
    }
  };

  const myUserId = user?.id ?? user?.userId ?? null;

  const myPlayerCharacterId = useMemo(() => {
    if (!myUserId) return null;
    const list = Array.isArray(characters) ? characters : [];
    const mine = list.find((c) => {
      const isPlayer = !!c?.isPlayer;
      const ownerId = c?.owner?.id ?? c?.ownerId ?? c?.owner_id ?? null;
      return isPlayer && ownerId != null && String(ownerId) === String(myUserId);
    });
    return mine?.id ?? null;
  }, [characters, myUserId]);

  useEffect(() => {
    if (!token) return;
    if (!myPlayerCharacterId) return;
    if (knownMap?.[myPlayerCharacterId]) return;
    loadKnown(myPlayerCharacterId);
  }, [token, myPlayerCharacterId, knownMap, loadKnown]);

  const relationByToId = useMemo(() => {
    if (!myPlayerCharacterId) return {};
    const rels = knownMap?.[myPlayerCharacterId];
    const list = Array.isArray(rels) ? rels : [];
    const map = {};

    for (const r of list) {
      const toId =
        r?.id ??
        r?.toCharacter?.id ??
        r?.toCharacterId ??
        r?.to_character_id ??
        r?.toId ??
        null;

      if (toId == null) continue;

      const score = r?.affinityScore ?? r?.affinity_score ?? r?.affinity ?? 0;
      const type = r?.type ?? r?.relationshipType ?? r?.relationType ?? "neutral";

      map[String(toId)] = { score, type };
    }

    return map;
  }, [knownMap, myPlayerCharacterId]);

  if (!token) return <p>Connecte-toi.</p>;
  if (loading) return <p>Chargement...</p>;
  if (loadError) return <p>Erreur : {loadError}</p>;

  return (
    <div className="characters-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Personnages</h1>

        {isAdminOrOwner && (
          <button
            type="button"
            className="relationship-add-button"
            onClick={() => setCreateOpen(true)}
            title="Créer un personnage"
          >
            + Créer
          </button>
        )}
      </div>

      {charactersByClan.map(([clanName, clanCharacters]) => (
        <section key={clanName} className="clan-section">
          <h2 className="clan-title">{clanName}</h2>

          <div className="characters-grid">
            {clanCharacters.map((char) => {
              const rel = myPlayerCharacterId ? relationByToId[String(char.id)] : null;
              const score = rel ? rel.score : null;
              const type = rel ? rel.type : null;

              return (
                <CharacterCard
              key={char.id}
              character={char}
              isAdminOrOwner={isAdminOrOwner}
              isOpen={openPanelId === char.id}
              relations={knownMap[char.id] ?? []}
              resolveAvatarUrl={resolveAvatarUrl}
              formatRelationType={formatRelationType}
              affinityScore={score}
              affinityType={type}
              onOpen={() => handleOpenCard(char.id)}
              onDoubleClick={() => navigate(`/transition-video/${char.id}`)}
              onEdit={() => navigate(`/characters/${char.id}/edit`)}
              onTrash={async () => {
                if (!window.confirm("Envoyer ce personnage dans la corbeille ?")) return;
                await sendToTrash(char.id);
              }}
              onUpdateStars={(toId, stars) => handleUpdateStars(char.id, toId, stars)}
              onRemoveRelation={(toId) => handleRemoveKnown(char.id, toId)}
              onAddKnown={async () => {
                await loadCandidates(char.id);
                setShowAddFor(char.id);
              }}
            />
              );
            })}
          </div>
        </section>
      ))}

      {showAddFor && (
        <AddKnownModal
          candidates={candidateMap[showAddFor] || []}
          selectedId={selectedCandidateId}
          selectedType={selectedRelationType}
          onSelectId={setSelectedCandidateId}
          onSelectType={setSelectedRelationType}
          onConfirm={handleAddKnownConfirm}
          onCancel={() => setShowAddFor(null)}
        />
      )}

      {createOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false);
          }}
        >
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(1200px, 95vw)" }}>
            <CampaignEditorPage
              embed
              onClose={() => setCreateOpen(false)}
              onCreated={async () => {
                await load();
                setCreateOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignCharactersPage;