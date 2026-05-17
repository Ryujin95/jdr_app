// src/pages/map/components/MapCreateLocationPanel.jsx
import { useState } from "react";
import { useNotification } from "../../../context/NotificationContext";

export default function MapCreateLocationPanel({ onClose, onSubmit }) {
  const [locName, setLocName] = useState("");
  const [locDescription, setLocDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit?.(locName, locDescription);
      addNotification({ type: "success", message: "Lieu créé avec succès." });
      setLocName("");
      setLocDescription("");
    } catch (err) {
      addNotification({ type: "error", message: err?.message || "Erreur lors de la création du lieu." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="map-panel" onSubmit={handleSubmit}>
      <div className="map-panel-row">
        <label>
          Nom du lieu
          <input value={locName} onChange={(e) => setLocName(e.target.value)} />
        </label>
      </div>

      <div className="map-panel-row">
        <label>
          Description (optionnel)
          <textarea value={locDescription} onChange={(e) => setLocDescription(e.target.value)} rows={3} />
        </label>
      </div>

      <div className="map-panel-actions">
        <button type="button" className="map-edit-btn" onClick={onClose} disabled={saving}>
          Fermer
        </button>
        <button type="submit" className="map-edit-btn active" disabled={saving}>
          {saving ? "Création…" : "Créer"}
        </button>
      </div>
    </form>
  );
}