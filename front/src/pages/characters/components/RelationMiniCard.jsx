import StarsEditor from "./StarsEditor";

function RelationMiniCard({ relation, avatarUrl, formattedType, onUpdateStars, onRemove }) {
  return (
    <div className="mini-character-card compact">
      {avatarUrl ? (
        <img src={avatarUrl} alt={relation.nickname} className="mini-avatar compact" />
      ) : (
        <div className="mini-avatar compact placeholder">
          {relation.nickname?.charAt(0) || "?"}
        </div>
      )}

      <div className="mini-info compact">
        <div className="mini-title compact">
          {relation.nickname}
          <span className="mini-type"> · {formattedType}</span>
        </div>

        <div className="mini-row">
          <StarsEditor
            value={relation.relationshipStars}
            onChange={(stars) => onUpdateStars?.(stars)}
          />

          <button
            type="button"
            className="mini-remove-button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            title="Supprimer ce connu"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default RelationMiniCard;