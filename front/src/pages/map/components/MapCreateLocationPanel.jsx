import { useState } from "react";
import { useNotification } from "../../../context/NotificationContext";
export default function MapCreateLocationPanel({ onClose, onSubmit }) {
  const [locName, setLocName] = useState("");
  const [locDescription, setLocDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  return (
   <form
  className="map-panel"
  onSubmit={async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSubmit?.(locName, locDescription);

      addNotification({
        type: "success",
        message: "Lieu créé avec succès.",
      });

      setLocName("");
      setLocDescription("");
    } catch (err) {
      const msg = err?.message || "Erreur lors de la création du lieu.";

      addNotification({
        type: "error",
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  }}
>
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