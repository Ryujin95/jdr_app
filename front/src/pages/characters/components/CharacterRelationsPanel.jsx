// src/pages/characters/components/CharacterRelationsPanel.jsx
import { useTranslation } from "react-i18next";
import RelationMiniCard from "./RelationMiniCard";

function CharacterRelationsPanel({
  relations,
  resolveAvatarUrl,
  formatRelationType,
  onUpdateStars,
  onRemove,
  onAddKnown,
}) {
  const { t } = useTranslation();

  return (
    <div className="relationship-panel inside" onClick={(e) => e.stopPropagation()}>
      <div className="relationship-panel-header">
        <div className="relationship-panel-title">{t("characters.relations.title")}</div>
        <button type="button" className="relationship-add-button" onClick={onAddKnown}>
          {t("characters.relations.addKnown")}
        </button>
      </div>

      {!Array.isArray(relations) ? (
        <p className="relationship-hint">{t("characters.relations.loading")}</p>
      ) : relations.length === 0 ? (
        <p className="relationship-hint">{t("characters.relations.empty")}</p>
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