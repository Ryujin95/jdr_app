// src/pages/map/components/MapDeleteLocationPanel.jsx
import { useState } from "react";
import { useNotification } from "../../../context/NotificationContext";

export default function MapDeleteLocationPanel({
  locations,
  selectedLocationId,
  setSelectedLocationId,
  loadingLocations,
  onClose,
  onDelete,
}) {
  const { addNotification } = useNotification();
  const [saving, setSaving] = useState(false);

  const list = Array.isArray(locations) ? locations : [];
  const hasAny = list.length > 0;

  const handleDelete = async () => {
    if (!selectedLocationId) return;

    const loc = list.find((l) => String(l.id) === String(selectedLocationId));
    const label = loc?.name ? ` "${loc.name}"` : "";
    if (!window.confirm(`Envoyer ce lieu${label} dans la corbeille ?`)) return;

    setSaving(true);
    try {
      await onDelete?.(selectedLocationId);
      addNotification({ type: "warning", message: "Lieu envoyé à la corbeille." });
    } catch (err) {
      addNotification({ type: "error", message: err?.message || "Erreur lors de la suppression du lieu." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="map-panel">
      <div className="map-panel-row">
        <label>
          Lieu à supprimer
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            disabled={!hasAny || saving}
          >
            {!hasAny ? (
              <option value="">Aucun lieu</option>
            ) : (
              list.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name || `Lieu #${l.id}`}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <div className="map-panel-actions">
        <button type="button" className="map-edit-btn" onClick={onClose} disabled={saving}>
          Fermer
        </button>
        <button
          type="button"
          className="map-edit-btn active"
          onClick={handleDelete}
          disabled={loadingLocations || saving || !selectedLocationId || !hasAny}
        >
          Envoyer à la corbeille
        </button>
      </div>
    </div>
  );
}