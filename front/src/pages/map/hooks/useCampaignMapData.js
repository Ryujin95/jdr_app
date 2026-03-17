// src/pages/map/hooks/useCampaignMapData.js
import { useCallback, useEffect, useState, useMemo } from "react";
import { API_URL } from "../../../config";

export function useCampaignMapData({ token, campaignId }) {
  const [maps, setMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const [error, setError] = useState("");

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);

  const selectedMap = useMemo(() => {
    return maps.find((m) => String(m.id) === String(selectedMapId)) || null;
  }, [maps, selectedMapId]);

  useEffect(() => {
    setMaps([]);
    setSelectedMapId(null);
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

        setMaps(list);

        if (list.length > 0) {
          setSelectedMapId((prev) =>
            prev && list.some((m) => String(m.id) === String(prev))
              ? prev
              : list[0].id
          );
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Erreur");
      } finally {
        setLoadingMap(false);
      }
    })();

    return () => controller.abort();
  }, [token, campaignId]);

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

  const refreshZones = useCallback(async () => {
    if (!token) return;
    if (!selectedMap?.id) return;

    setLoadingZones(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/zones?mapId=${encodeURIComponent(String(selectedMap.id))}`,
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
  }, [token, selectedMap?.id]);

  useEffect(() => {
    setZones([]);
    if (!selectedMap?.id) return;
    refreshZones();
  }, [selectedMap?.id, refreshZones]);

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

      setZones((prev) => prev.filter((z) => String(z.id) !== String(id)));

      return true;
    },
    [token]
  );

  const moveCharacterToZone = useCallback(
    async (characterId, targetZone) => {
      if (!token) throw new Error("Non authentifié");
      if (!characterId) throw new Error("characterId manquant");

      const locationId =
        targetZone?.locationId ??
        targetZone?.location_id ??
        targetZone?.location?.id ??
        null;

      if (!locationId) {
        throw new Error("La zone cible n'a pas de lieu associé.");
      }

      const formData = new FormData();
      formData.append("locationId", String(locationId));

      const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

      const res = await fetch(`${API_URL}/characters/${encodeURIComponent(characterId)}${qs}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      await refreshZones();
      return true;
    },
    [token, campaignId, refreshZones]
  );

  return {
    maps,
    selectedMap,
    selectedMapId,
    setSelectedMapId,

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

    deleteZone,
    moveCharacterToZone,
  };
}