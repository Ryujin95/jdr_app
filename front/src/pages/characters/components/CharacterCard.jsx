import CharacterRelationsPanel from "./CharacterRelationsPanel";

function scoreToStars(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s === 0) return 0;
  if (s <= 20) return 1;
  if (s <= 40) return 2;
  if (s <= 60) return 3;
  if (s <= 80) return 4;
  return 5;
}

function StarsRow({ stars }) {
  if (stars == null) return null;

  const n = Math.max(0, Math.min(5, Number(stars) || 0));

  return (
    <div className="character-affinity-stars" aria-label={`Affinité: ${n} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "star on" : "star off"}>
          ★
        </span>
      ))}
    </div>
  );
}

function CharacterCard({
  character,
  isAdminOrOwner,
  isOpen,
  relations,
  resolveAvatarUrl,
  formatRelationType,
  affinityScore,
  affinityType,
  onOpen,
  onDoubleClick,
  onEdit,
  onTrash,
  onUpdateStars,
  onRemoveRelation,
  onAddKnown,
}) {
  const avatarSrc = resolveAvatarUrl(character.avatarUrl);

  const ownerLabel =
    character.owner?.username ||
    character.owner?.email ||
    (character.owner?.id ? `User #${character.owner.id}` : null);

  const stars = affinityScore == null ? null : scoreToStars(affinityScore);
  const relationLabel = affinityType ? formatRelationType?.(affinityType) ?? affinityType : null;

  return (
    <div
      className={`character-card ${isOpen ? "open" : ""}`}
      onClick={onOpen}
      onDoubleClick={onDoubleClick}
    >
      <div className="character-card-top">
        <div className="character-avatar-wrapper">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={character.nickname || character.firstname}
              className="character-avatar"
            />
          ) : (
            <div className="character-avatar placeholder">
              {character.nickname?.charAt(0) || character.firstname?.charAt(0) || "?"}
            </div>
          )}

          <StarsRow stars={stars} />
          {relationLabel && <div className="character-affinity-type">{relationLabel}</div>}
        </div>

        <div className="character-info">
          <h3 className="character-nickname">{character.nickname}</h3>

          <p className="character-name">
            {character.firstname} {character.lastname}
          </p>

          <p className="character-age">{character.age} ans</p>

          {character.isPlayer ? (
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                Modifier
              </button>

              <button
                type="button"
                className="character-trash-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTrash?.();
                }}
              >
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdminOrOwner && isOpen && (
        <CharacterRelationsPanel
          relations={relations}
          resolveAvatarUrl={resolveAvatarUrl}
          formatRelationType={formatRelationType}
          onUpdateStars={onUpdateStars}
          onRemove={onRemoveRelation}
          onAddKnown={onAddKnown}
        />
      )}
    </div>
  );
}

export default CharacterCard;