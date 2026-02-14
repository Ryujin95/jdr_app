// src/pages/CampaignMapPage.jsx
import { useOutletContext } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/MapPage.css";

export default function CampaignMapPage() {
  const outlet = useOutletContext() || {};
  const { campaignId, campaign } = outlet;
  const { token } = useContext(AuthContext);

  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mapId = useMemo(() => {
    const v = campaign?.mapId;
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [campaign?.mapId]);

  const BACK_BASE_URL = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const resolveUrl = (path) => {
    if (!path) return null;
    const url = String(path).trim();
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${BACK_BASE_URL}${url}`;
    return `${BACK_BASE_URL}/${url}`;
  };

  useEffect(() => {
    setMapData(null);
    setError("");

    if (!token) return;
    if (!mapId) return;

    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/maps/${mapId}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          setError(txt || "Impossible de charger la map.");
          return;
        }

        const data = await res.json().catch(() => null);
        setMapData(data);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Erreur");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [token, mapId, campaignId]);

  if (!mapId) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">Aucune map pour cette campagne.</div>
      </div>
    );
  }

  if (loading) {
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

  const img = resolveUrl(mapData?.imagePath);

  return (
    <div className="map-page">
      <h1 className="map-title">{mapData?.name ? `Carte : ${mapData.name}` : "Carte"}</h1>

      {!img ? (
        <div className="map-empty">Map sans image.</div>
      ) : (
        <div className="map-container map-container--relative">
          <img src={img} alt={mapData?.name || "Carte"} className="map-image" draggable={false} />
        </div>
      )}
    </div>
  );
}
