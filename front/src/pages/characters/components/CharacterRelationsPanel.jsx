import RelationMiniCard from "./RelationMiniCard";

function CharacterRelationsPanel({
  relations,
  resolveAvatarUrl,
  formatRelationType,
  onUpdateStars,
  onRemove,
  onAddKnown,
}) {
  return (
    <div className="relationship-panel inside" onClick={(e) => e.stopPropagation()}>
      <div className="relationship-panel-header">
        <div className="relationship-panel-title">Relations</div>

        <button
          type="button"
          className="relationship-add-button"
          onClick={onAddKnown}
        >
          Ajouter un connu
        </button>
      </div>

      {!Array.isArray(relations) ? (
        <p style={{ margin: 0, opacity: 0.8 }}>Chargement...</p>
      ) : relations.length === 0 ? (
        <p style={{ margin: 0, opacity: 0.8 }}>Aucun personnage connu pour l’instant.</p>
      ) : (
        <div className="relationship-mini-grid">
          {relations.map((rel) => (
            <RelationMiniCard
              key={rel.id}
              relation={rel}
              avatarUrl={resolveAvatarUrl(rel.avatarUrl)}
              formattedType={formatRelationType(rel.type)}
              onUpdateStars={(stars) => onUpdateStars?.(rel.id, stars)}
              onRemove={() => onRemove?.(rel.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CharacterRelationsPanel;