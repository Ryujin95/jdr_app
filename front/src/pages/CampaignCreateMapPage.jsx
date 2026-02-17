// src/pages/CampaignCreateMapPage.jsx
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { apiDeleteMap, apiListMaps } from "../api/api";
import { API_URL } from "../config";
import "../CSS/CampaignCreateMap.css";

export default function CampaignMapCreatePage() {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [maps, setMaps] = useState([]);
  const [deleteMapId, setDeleteMapId] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => {
    if (!token || !campaignId) return false;
    if (!name.trim()) return false;
    if (!imageFile) return false; // image obligatoire
    return true;
  }, [token, campaignId, name, imageFile]);

  const refreshMaps = useCallback(async () => {
    if (!token || !campaignId) return;

    setLoadingMaps(true);
    setError(null);

    try {
      const data = await apiListMaps(token, campaignId);
      const list = Array.isArray(data) ? data : [];
      setMaps(list);

      setDeleteMapId((prev) => {
        if (!prev) return list.length > 0 ? String(list[0].id) : "";
        const stillExists = list.some((m) => String(m.id) === String(prev));
        return stillExists ? prev : list.length > 0 ? String(list[0].id) : "";
      });
    } catch (e) {
      setError(e?.message || "Erreur lors du chargement des maps.");
    } finally {
      setLoadingMaps(false);
    }
  }, [token, campaignId]);

  useEffect(() => {
    refreshMaps();
  }, [refreshMaps]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("campaignId", String(campaignId));
      fd.append("name", name.trim());
      fd.append("image", imageFile);

      const res = await fetch(`${API_URL}/maps`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // surtout PAS de Content-Type ici
        },
        body: fd,
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.message || `HTTP ${res.status}`);
        }
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      setName("");
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);

      await refreshMaps();
      navigate(`/campaigns/${campaignId}/map`, { replace: true });
    } catch (err) {
      setError(err?.message || "Erreur lors de la création de la map.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMap = async () => {
    setError(null);

    if (!token || !campaignId) return;

    if (!deleteMapId) {
      setError("Choisis une map à supprimer.");
      return;
    }

    const m = maps.find((x) => String(x.id) === String(deleteMapId));
    const label = m?.name ? ` "${m.name}"` : "";
    const ok = window.confirm(`Supprimer définitivement la map${label} ?`);
    if (!ok) return;

    setDeleting(true);
    try {
      await apiDeleteMap(token, deleteMapId);
      await refreshMaps();
    } catch (e) {
      setError(e?.message || "Erreur lors de la suppression de la map.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/campaigns/${campaignId}/map`);
  };

  return (
    <div className="campaign-map-create">
      <h2 className="campaign-map-create-title">Créer une map</h2>

      {error && <p className="campaign-map-create-error">{error}</p>}

      <form className="campaign-map-create-form" onSubmit={handleSubmit}>
        <div className="campaign-map-create-field">
          <label className="campaign-map-create-label" htmlFor="map-name">
            Nom
          </label>
          <input
            id="map-name"
            className="campaign-map-create-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Map principale"
            autoComplete="off"
          />
        </div>

        <div className="campaign-map-create-field">
          <label className="campaign-map-create-label" htmlFor="map-image-file">
            Image (obligatoire)
          </label>
          <input
            id="map-image-file"
            className="campaign-map-create-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {imagePreview && (
            <div className="campaign-map-create-preview">
              <img src={imagePreview} alt="Aperçu" />
            </div>
          )}
        </div>

        <div className="campaign-map-create-actions">
          <button
            type="button"
            className="campaign-map-create-btn campaign-map-create-btn-secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Annuler
          </button>

          <button
            type="submit"
            className="campaign-map-create-btn campaign-map-create-btn-primary"
            disabled={!canSubmit || loading}
          >
            {loading ? "Création..." : "Créer la map"}
          </button>
        </div>
      </form>

      <div className="campaign-map-delete">
        <h2 className="campaign-map-create-title">Supprimer une map</h2>

        {loadingMaps ? (
          <p className="campaign-map-create-info">Chargement des maps…</p>
        ) : (
          <div className="campaign-map-create-field">
            <label className="campaign-map-create-label">
              Maps existantes
              <select
                className="campaign-map-create-input"
                value={deleteMapId}
                onChange={(e) => setDeleteMapId(e.target.value)}
                disabled={maps.length === 0 || deleting}
              >
                {maps.length === 0 ? (
                  <option value="">Aucune map</option>
                ) : (
                  maps.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || `Map #${m.id}`}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        )}

        <div className="campaign-map-create-actions">
          <button
            type="button"
            className="campaign-map-create-btn campaign-map-create-btn-danger"
            onClick={handleDeleteMap}
            disabled={deleting || !deleteMapId || loadingMaps}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
