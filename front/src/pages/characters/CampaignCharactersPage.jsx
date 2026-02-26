import { useEffect, useContext, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { NotificationContext } from "../../context/NotificationContext";
import { useCharacters } from "./hooks/useCharacters";
import { useCharacterRelations } from "./hooks/useCharacterRelations";
import { useCreateCharacter } from "./hooks/useCreateCharacter";
import CharacterCard from "./components/CharacterCard";
import AddKnownModal from "./components/AddKnownModal";
import CreateCharacterModal from "./components/CreateCharacterModal";
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

  const campaignId = outlet.campaignId
    ? Number(outlet.campaignId)
    : Number(campaignIdParam);

  const isOwner = !!outlet.isMjInThisCampaign;
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes("ROLE_ADMIN");
  const isAdminOrOwner = isAdmin || isOwner;

  const {
    characters,
    loading,
    loadError,
    load,
    sendToTrash,
  } = useCharacters(token, campaignId);

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
  } = useCharacterRelations(token, campaignId);

  const {
    submitting,
    error: createError,
    submit: submitCreate,
  } = useCreateCharacter(token, campaignId, load);

  const [showAddFor, setShowAddFor] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedRelationType, setSelectedRelationType] = useState("neutral");

  const [createOpen, setCreateOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    nickname: "",
    firstname: "",
    lastname: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    if (token && campaignId) load();
  }, [token, campaignId, load]);

  const charactersByClan = useMemo(
    () => groupCharactersByClan(characters),
    [characters]
  );

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
      await handleAddKnown(
        showAddFor,
        Number(selectedCandidateId),
        normalizeTypeForApi(selectedRelationType)
      );

      addNotification?.({ type: "success", message: "Relation ajoutée." });

      setShowAddFor(null);
      setSelectedCandidateId("");
      setSelectedRelationType("neutral");
    } catch (e) {
      addNotification?.({ type: "error", message: e.message });
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("campaignId", String(campaignId));
    formData.append("nickname", formValues.nickname);
    formData.append("firstname", formValues.firstname);
    formData.append("lastname", formValues.lastname);

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      await submitCreate(formData);
      addNotification?.({ type: "success", message: "Personnage créé." });
      setCreateOpen(false);
      setFormValues({ nickname: "", firstname: "", lastname: "" });
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch {
      addNotification?.({ type: "error", message: "Erreur création." });
    }
  };

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
          {clanCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isAdminOrOwner={isAdminOrOwner}
              isOpen={openPanelId === char.id}
              relations={knownMap[char.id]}
              resolveAvatarUrl={resolveAvatarUrl}
              formatRelationType={formatRelationType}
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
          ))}
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

    <CreateCharacterModal
      open={createOpen}
      error={createError}
      submitting={submitting}
      formValues={formValues}
      avatarPreview={avatarPreview}
      onChange={(field, value) => setFormValues((prev) => ({ ...prev, [field]: value }))}
      onAvatarChange={(e) => {
        const file = e.target.files?.[0] || null;
        setAvatarFile(file);
        if (file) setAvatarPreview(URL.createObjectURL(file));
      }}
      onSubmit={handleCreateSubmit}
      onCancel={() => setCreateOpen(false)}
    />
  </div>
);

}

export default CampaignCharactersPage;