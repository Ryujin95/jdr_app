// src/pages/map/hooks/useCampaignMapData.js
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../../config";

export function useCampaignMapData({ token, campaignId }) {
  const [mapData, setMapData] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [error, setError] = useState("");

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // --- LOAD MAP ---
  useEffect(() => {
    setMapData(null);
    setError("");

    if (!token) return;
    if (!campaignId) return;

    const controller = new AbortController();
    setLoadingMap(true);

    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/maps?campaignId=${encodeURIComponent(campaignId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          setError(txt || "Impossible de charger les maps de la campagne.");
          return;
        }

        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setMapData(list.length > 0 ? list[0] : null);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Erreur");
      } finally {
        setLoadingMap(false);
      }
    })();

    return () => controller.abort();
  }, [token, campaignId]);

  // --- LOCATIONS ---
  const refreshLocations = useCallback(async () => {
    if (!token || !campaignId) return;

    setLoadingLocations(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/locations?campaignId=${encodeURIComponent(campaignId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Impossible de charger les lieux.");
      }

      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setLocations(list);

      setSelectedLocationId((prev) => {
        if (prev && list.some((l) => String(l.id) === String(prev))) return prev;
        return list.length > 0 ? String(list[0].id) : "";
      });
    } catch (e) {
      setError(e?.message || "Erreur lors du chargement des lieux.");
    } finally {
      setLoadingLocations(false);
    }
  }, [token, campaignId]);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  const createLocation = useCallback(
    async ({ name, description }) => {
      if (!token || !campaignId) return;

      const cleanName = String(name || "").trim();
      if (!cleanName) throw new Error("Le nom du lieu est obligatoire.");

      const resLoc = await fetch(`${API_URL}/locations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          campaignId: Number(campaignId),
          name: cleanName,
          description: String(description || "").trim(),
        }),
      });

      if (!resLoc.ok) {
        const ct = resLoc.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await resLoc.json().catch(() => null);
          throw new Error(j?.message || `HTTP ${resLoc.status}`);
        }
        const txt = await resLoc.text().catch(() => "");
        throw new Error(txt || `HTTP ${resLoc.status}`);
      }

      return resLoc.json().catch(() => null);
    },
    [token, campaignId]
  );

  const deleteLocationToTrash = useCallback(
    async (locationId) => {
      if (!token || !campaignId) return;

      const id = String(locationId || "");
      if (!id) throw new Error("Choisis un lieu à supprimer.");

      const res = await fetch(
        `${API_URL}/trash/move/location/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ campaignId: Number(campaignId) }),
        }
      );

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.message || `HTTP ${res.status}`);
        }
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      return true;
    },
    [token, campaignId]
  );

  // --- ZONES ---
  const refreshZones = useCallback(async () => {
    if (!token) return;
    if (!mapData?.id) return;

    setLoadingZones(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/zones?mapId=${encodeURIComponent(String(mapData.id))}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Impossible de charger les zones.");
      }

      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setZones(list);
    } catch (e) {
      setError(e?.message || "Erreur lors du chargement des zones.");
    } finally {
      setLoadingZones(false);
    }
  }, [token, mapData?.id]);

  useEffect(() => {
    setZones([]);
    if (!mapData?.id) return;
    refreshZones();
  }, [mapData?.id, refreshZones]);

  // ✅ DELETE ZONE + SUPPRESSION INSTANTANÉE (sans refresh)
  const deleteZone = useCallback(
    async (zoneId) => {
      if (!token) return;

      const id = String(zoneId || "");
      if (!id) throw new Error("zoneId manquant.");

      const res = await fetch(`${API_URL}/zones/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      // 🔥 instant UI
      setZones((prev) => prev.filter((z) => String(z.id) !== String(id)));

      return true;
    },
    [token]
  );

  return {
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

    deleteZone, // ✅ export
  };
}