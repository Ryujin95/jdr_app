// src/pages/map/components/MapCanvas.jsx
import { toNum } from "../utils/mapMath";

export default function MapCanvas({
  img,
  mapName,
  zones,
  loadingZones,
  isEditing,
  isMjInThisCampaign,
  activeZoneId,
  resolveUrl,
  onZonePointerDown,
  onZonePointerMove,
  onZonePointerUp,
  onZoneOpen,
  onCharacterDragStart,
  onCharacterDropOnZone,
}) {
  return (
    <div
      className={isEditing && isMjInThisCampaign ? "map-container map-container--relative editing" : "map-container map-container--relative"}
      onPointerMove={onZonePointerMove}
      onPointerUp={onZonePointerUp}
      onPointerCancel={onZonePointerUp}
    >
      <img src={img} alt={mapName || "Carte"} className="map-image" draggable={false} />

      {loadingZones
        ? null
        : (Array.isArray(zones) ? zones : []).map((z) => {
            const top = toNum(z.topPercent ?? z.top_percent);
            const left = toNum(z.leftPercent ?? z.left_percent);
            const width = toNum(z.widthPercent ?? z.width_percent);
            const height = toNum(z.heightPercent ?? z.height_percent);

            if (![top, left, width, height].every((n) => Number.isFinite(n))) return null;

            const chars =
              z?.characters ??
              z?.personnages ??
              z?.persons ??
              z?.members ??
              z?.zoneCharacters ??
              z?.zone_characters ??
              [];

            const list = Array.isArray(chars) ? chars : [];

            return (
              <div
                key={z.id}
                className={activeZoneId === z.id ? "map-zone active" : "map-zone"}
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  cursor: isEditing && isMjInThisCampaign ? "grab" : "pointer",
                }}
                onPointerDown={(e) => (isMjInThisCampaign ? onZonePointerDown?.(e, z, "move") : undefined)}
                onClick={() => onZoneOpen?.(z)}
                onDragOver={(e) => {
                  if (!isMjInThisCampaign || isEditing) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!isMjInThisCampaign || isEditing) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onCharacterDropOnZone?.(z);
                }}
                role="button"
                tabIndex={0}
              >
                {!isEditing && list.length > 0 ? (
                  <div className="map-zone-characters">
                    {list.map((c) => {
                      const nickname = String(c?.nickname ?? c?.surnom ?? c?.name ?? "").trim();
                      const avatar = resolveUrl(
                        c?.avatarUrl ?? c?.avatar_url ?? c?.avatarPath ?? c?.avatar_path ?? c?.avatar
                      );

                      return (
                        <div
                          key={c.id ?? `${nickname}-${String(avatar)}`}
                          className="map-zone-character-card"
                          draggable={isMjInThisCampaign}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            onCharacterDragStart?.(c, z);
                          }}
                        >
                          {avatar ? (
                            <img className="map-zone-character-avatar" src={avatar} alt={nickname || "avatar"} draggable={false} />
                          ) : null}
                          {nickname ? <div className="map-zone-character-nickname">{nickname}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {isEditing && isMjInThisCampaign ? (
                  <span className="map-zone-handle" onPointerDown={(e) => onZonePointerDown?.(e, z, "se")} />
                ) : null}
              </div>
            );
          })}
    </div>
  );
}