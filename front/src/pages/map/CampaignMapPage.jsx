// src/pages/map/CampaignMapPage.jsx
import { useOutletContext } from "react-router-dom";
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { API_URL } from "../../config";
import { AuthContext } from "../../context/AuthContext";
import "../../CSS/MapPage.css";

import ZoneZoomOverlay from "../../components/ZoneZoomOverlay";
import MapCanvas from "./components/MapCanvas";
import MapCreateLocationPanel from "./components/MapCreateLocationPanel";
import MapDeleteLocationPanel from "./components/MapDeleteLocationPanel";

import { makeResolveUrl } from "../../utils/resolveUrl";
import { useCampaignMapData } from "./hooks/useCampaignMapData";
import { useZoneEditor } from "./hooks/useZoneEditor";

export default function CampaignMapPage() {
  const outlet = useOutletContext() || {};
  const campaignId = outlet?.campaignId ? String(outlet.campaignId) : null;
  const isMjInThisCampaign = !!outlet?.isMjInThisCampaign;

  const { token } = useContext(AuthContext);

  const [isEditing, setIsEditing] = useState(false);
  const [panel, setPanel] = useState(null);
  const [zoomZone, setZoomZone] = useState(null);

  const resolveUrl = useMemo(() => makeResolveUrl(API_URL), []);
  const {
    mapData,
    loadingMap,
    error,
    setError,

    locations,
    loadingLocations,
    selectedLocationId,
    setSelectedLocationId,

    zones,
    setZones,
    loadingZones,

    refreshLocations,
    refreshZones,

    createLocation,
    deleteLocationToTrash,
  } = useCampaignMapData({ token, campaignId });

  const img = resolveUrl(mapData?.imagePath);

  useEffect(() => {
    if (!isMjInThisCampaign) {
      setIsEditing(false);
      setPanel(null);
    }
  }, [isMjInThisCampaign]);

  const { activeZoneId, onZonePointerDown, onZonePointerMove, onZonePointerUp } = useZoneEditor({
    token,
    isEditing,
    isMjInThisCampaign,
    zones,
    setZones,
    setError,
  });

  useEffect(() => {
    const onTrashChanged = () => {
      refreshLocations();
      refreshZones();
    };

    window.addEventListener("trash:changed", onTrashChanged);
    return () => window.removeEventListener("trash:changed", onTrashChanged);
  }, [refreshLocations, refreshZones]);

  const openZoneZoom = useCallback(
    (z) => {
      if (!img) return;
      if (isEditing) return;
      setZoomZone(z);
    },
    [img, isEditing]
  );

  const closeZoneZoom = () => setZoomZone(null);

  if (!campaignId) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">Aucune campagne active.</div>
      </div>
    );
  }

  if (loadingMap) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">{error}</div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">Aucune map pour cette campagne.</div>
      </div>
    );
  }

  return (
    <div className="map-page">
      <div className="map-header">
        <h1 className="map-title">{mapData?.name ? `Carte : ${mapData.name}` : "Carte"}</h1>

        {isMjInThisCampaign ? (
          <div className="map-actions">
            <button
              type="button"
              className="map-edit-btn"
              onClick={() => setPanel((p) => (p === "create" ? null : "create"))}
            >
              Créer un lieu
            </button>

            <button
              type="button"
              className="map-edit-btn"
              onClick={() => setPanel((p) => (p === "delete" ? null : "delete"))}
              disabled={loadingLocations}
            >
              Supprimer
            </button>

            <button
              type="button"
              className={isEditing ? "map-edit-btn active" : "map-edit-btn"}
              onClick={() => setIsEditing((v) => !v)}
              disabled={!img}
              title={!img ? "Ajoute une image à la map d’abord" : undefined}
            >
              {isEditing ? "Quitter l’édition" : "Éditer"}
            </button>
          </div>
        ) : null}
      </div>

      {isMjInThisCampaign && panel === "create" ? (
          <MapCreateLocationPanel
          onClose={() => setPanel(null)}
          onSubmit={async (name, description) => {
            setError("");
            const clean = String(name || "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ");
            const exists = (Array.isArray(locations) ? locations : []).some((l) => {
              const lname = String(l?.name || "")
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");
              return lname === clean;
            });
            if (!clean) {
              setError("Le nom du lieu est obligatoire.");
              return;
            }
            if (exists) {
              setError("Ce lieu existe déjà. Choisis un autre nom.");
              return;
            }
            await createLocation({ name, description });
            await refreshLocations();
            await refreshZones();
            setPanel(null);
          }}
        />
      ) : null}

      {isMjInThisCampaign && panel === "delete" ? (
        <MapDeleteLocationPanel
          locations={locations}
          selectedLocationId={selectedLocationId}
          setSelectedLocationId={setSelectedLocationId}
          loadingLocations={loadingLocations}
          onClose={() => setPanel(null)}
          onDelete={async (locationId) => {
            setError("");
            await deleteLocationToTrash(locationId);
            setZones((prev) =>
              (Array.isArray(prev) ? prev : []).filter((z) => {
                const zLocId = z?.locationId ?? z?.location_id ?? z?.location?.id;
                return String(zLocId) !== String(locationId);
              })
            );
            await refreshLocations();
            setPanel(null);
          }}
        />
      ) : null}

      {!img ? (
        <div className="map-empty">Map sans image.</div>
      ) : (
        <MapCanvas
          img={img}
          mapName={mapData?.name}
          zones={zones}
          loadingZones={loadingZones}
          isEditing={isEditing}
          isMjInThisCampaign={isMjInThisCampaign}
          activeZoneId={activeZoneId}
          resolveUrl={resolveUrl}
          onZonePointerDown={onZonePointerDown}
          onZonePointerMove={onZonePointerMove}
          onZonePointerUp={onZonePointerUp}
          onZoneOpen={openZoneZoom}
        />
      )}

      {zoomZone && img ? (
        <ZoneZoomOverlay
          img={img}
          zone={zoomZone}
          token={token}
          resolveUrl={resolveUrl}
          onClose={closeZoneZoom}
        />
      ) : null}
    </div>
  );
}