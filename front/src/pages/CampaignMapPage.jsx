// src/pages/CampaignMapPage.jsx
import { useOutletContext } from "react-router-dom";
import { useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/MapPage.css";

export default function CampaignMapPage() {
  const outlet = useOutletContext() || {};
  const campaignId = outlet?.campaignId ? String(outlet.campaignId) : null;

  const { token } = useContext(AuthContext);

  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);

  const [panel, setPanel] = useState(null);
  const [locName, setLocName] = useState("");
  const [locDescription, setLocDescription] = useState("");

  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);

  const [activeZoneId, setActiveZoneId] = useState(null);
  const dragRef = useRef(null);

  const BACK_BASE_URL = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const resolveUrl = (path) => {
    if (!path) return null;
    const url = String(path).trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${BACK_BASE_URL}${url}`;
    return `${BACK_BASE_URL}/${url}`;
  };

  const toNum = (v) => {
    if (v === null || v === undefined) return NaN;
    if (typeof v === "number") return v;
    const s = String(v).trim().replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const clampMove = (top, left, width, height) => {
    const t = clamp(top, 0, Math.max(0, 100 - height));
    const l = clamp(left, 0, Math.max(0, 100 - width));
    return { top: t, left: l };
  };

  const clampResize = (top, left, width, height) => {
    const w = clamp(width, 1, Math.max(1, 100 - left));
    const h = clamp(height, 1, Math.max(1, 100 - top));
    return { width: w, height: h };
  };

  const getZoneCharacters = (z) => {
    const candidates = z?.characters ?? z?.personnages ?? z?.persons ?? z?.members ?? z?.zoneCharacters ?? z?.zone_characters ?? [];
    return Array.isArray(candidates) ? candidates : [];
  };

  const getCharacterNickname = (c) => String(c?.nickname ?? c?.surnom ?? c?.name ?? "").trim();

  const getCharacterAvatarUrl = (c) => {
    const raw = c?.avatarUrl ?? c?.avatar_url ?? c?.avatarPath ?? c?.avatar_path ?? c?.avatar;
    return resolveUrl(raw);
  };

  useEffect(() => {
    setMapData(null);
    setError("");

    if (!token) return;
    if (!campaignId) return;

    const controller = new AbortController();
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/maps?campaignId=${encodeURIComponent(campaignId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

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
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [token, campaignId]);

  const patchZone = useCallback(
    async (zoneId, payload) => {
      if (!token) return null;

      const res = await fetch(`${API_URL}/zones/${zoneId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      return await res.json().catch(() => null);
    },
    [token]
  );

  const refreshLocations = useCallback(async () => {
    if (!token || !campaignId) return;

    setLoadingLocations(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/locations?campaignId=${encodeURIComponent(campaignId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  const refreshZones = useCallback(async () => {
    if (!token) return;
    if (!mapData?.id) return;

    setLoadingZones(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/zones?mapId=${encodeURIComponent(String(mapData.id))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
    setActiveZoneId(null);
    if (!mapData?.id) return;
    refreshZones();
  }, [mapData?.id, refreshZones]);

  useEffect(() => {
    const onTrashChanged = () => {
      refreshLocations();
      refreshZones();
    };

    window.addEventListener("trash:changed", onTrashChanged);
    return () => window.removeEventListener("trash:changed", onTrashChanged);
  }, [refreshLocations, refreshZones]);

  const onZonePointerDown = (e, z, mode) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();

    setActiveZoneId(z.id);

    const container = e.currentTarget.closest(".map-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;

    const startTop = toNum(z.topPercent ?? z.top_percent);
    const startLeft = toNum(z.leftPercent ?? z.left_percent);
    const startWidth = toNum(z.widthPercent ?? z.width_percent);
    const startHeight = toNum(z.heightPercent ?? z.height_percent);

    dragRef.current = {
      id: z.id,
      mode,
      rect,
      startX,
      startY,
      startTop,
      startLeft,
      startWidth,
      startHeight,
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onZonePointerMove = (e) => {
    if (!isEditing) return;
    const d = dragRef.current;
    if (!d) return;

    const dxPx = e.clientX - d.startX;
    const dyPx = e.clientY - d.startY;

    const dxPct = (dxPx / d.rect.width) * 100;
    const dyPct = (dyPx / d.rect.height) * 100;

    setZones((prev) =>
      prev.map((zz) => {
        if (zz.id !== d.id) return zz;

        const top = toNum(zz.topPercent ?? zz.top_percent);
        const left = toNum(zz.leftPercent ?? zz.left_percent);
        const width = toNum(zz.widthPercent ?? zz.width_percent);
        const height = toNum(zz.heightPercent ?? zz.height_percent);

        if (![top, left, width, height].every((n) => Number.isFinite(n))) return zz;

        if (d.mode === "move") {
          const ntRaw = d.startTop + dyPct;
          const nlRaw = d.startLeft + dxPct;
          const { top: nt, left: nl } = clampMove(ntRaw, nlRaw, width, height);
          return { ...zz, topPercent: nt, leftPercent: nl };
        }

        if (d.mode === "se") {
          const nwRaw = d.startWidth + dxPct;
          const nhRaw = d.startHeight + dyPct;
          const { width: nw, height: nh } = clampResize(top, left, nwRaw, nhRaw);
          return { ...zz, widthPercent: nw, heightPercent: nh };
        }

        return zz;
      })
    );
  };

  const onZonePointerUp = async () => {
    if (!isEditing) return;
    const d = dragRef.current;
    if (!d) return;

    dragRef.current = null;

    const z = zones.find((x) => x.id === d.id);
    if (!z) return;

    const payload = {
      topPercent: toNum(z.topPercent ?? z.top_percent),
      leftPercent: toNum(z.leftPercent ?? z.left_percent),
      widthPercent: toNum(z.widthPercent ?? z.width_percent),
      heightPercent: toNum(z.heightPercent ?? z.height_percent),
    };

    try {
      await patchZone(d.id, payload);
    } catch (err) {
      setError(err?.message || "Erreur update zone");
    }
  };

  const handleCreateLocationAndZone = async (e) => {
    e.preventDefault();
    setError("");

    if (!token || !campaignId) return;
    if (!mapData?.id) {
      setError("Aucune map active pour créer une zone.");
      return;
    }

    const name = locName.trim();
    if (!name) {
      setError("Le nom du lieu est obligatoire.");
      return;
    }

    try {
      const resLoc = await fetch(`${API_URL}/locations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          campaignId: Number(campaignId),
          name,
          description: locDescription.trim() ? locDescription.trim() : "",
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

      await resLoc.json().catch(() => null);

      setLocName("");
      setLocDescription("");

      await refreshLocations();
      await refreshZones();

      setPanel(null);
    } catch (e2) {
      setError(e2?.message || "Erreur lors de la création du lieu.");
    }
  };

  const handleDeleteLocationToTrash = async () => {
    setError("");

    if (!token) return;
    if (!campaignId) {
      setError("campaignId manquant.");
      return;
    }
    if (!selectedLocationId) {
      setError("Choisis un lieu à supprimer.");
      return;
    }

    const loc = locations.find((l) => String(l.id) === String(selectedLocationId));
    const label = loc?.name ? ` "${loc.name}"` : "";
    const ok = window.confirm(`Envoyer ce lieu${label} dans la corbeille ?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/trash/move/location/${selectedLocationId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ campaignId: Number(campaignId) }),
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

      await refreshLocations();
      await refreshZones();
    } catch (e) {
      setError(e?.message || "Erreur lors de la suppression (corbeille).");
    }
  };

  if (!campaignId) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">Aucune campagne active.</div>
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

  if (!mapData) {
    return (
      <div className="map-page">
        <h1 className="map-title">Carte</h1>
        <div className="map-empty">Aucune map pour cette campagne.</div>
      </div>
    );
  }

  const img = resolveUrl(mapData?.imagePath);

  return (
    <div className="map-page">
      <div className="map-header">
        <h1 className="map-title">{mapData?.name ? `Carte : ${mapData.name}` : "Carte"}</h1>

        <div className="map-actions">
          <button type="button" className="map-edit-btn" onClick={() => setPanel((p) => (p === "create" ? null : "create"))}>
            Créer un lieu
          </button>

          <button type="button" className="map-edit-btn" onClick={() => setPanel((p) => (p === "delete" ? null : "delete"))} disabled={loadingLocations}>
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
      </div>

      {panel === "create" ? (
        <form className="map-panel" onSubmit={handleCreateLocationAndZone}>
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
            <button type="button" className="map-edit-btn" onClick={() => setPanel(null)}>
              Fermer
            </button>
            <button type="submit" className="map-edit-btn active">
              Créer
            </button>
          </div>
        </form>
      ) : null}

      {panel === "delete" ? (
        <div className="map-panel">
          <div className="map-panel-row">
            <label>
              Lieu à supprimer
              <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
                {locations.length === 0 ? (
                  <option value="">Aucun lieu</option>
                ) : (
                  locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name || `Lieu #${l.id}`}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <div className="map-panel-actions">
            <button type="button" className="map-edit-btn" onClick={() => setPanel(null)}>
              Fermer
            </button>
            <button type="button" className="map-edit-btn active" onClick={handleDeleteLocationToTrash} disabled={!selectedLocationId || locations.length === 0}>
              Envoyer à la corbeille
            </button>
          </div>
        </div>
      ) : null}

      {!img ? (
        <div className="map-empty">Map sans image.</div>
      ) : (
        <div
          className={isEditing ? "map-container map-container--relative editing" : "map-container map-container--relative"}
          onPointerMove={onZonePointerMove}
          onPointerUp={onZonePointerUp}
          onPointerCancel={onZonePointerUp}
        >
          <img src={img} alt={mapData?.name || "Carte"} className="map-image" draggable={false} />

          {loadingZones
            ? null
            : zones.map((z) => {
                const top = toNum(z.topPercent ?? z.top_percent);
                const left = toNum(z.leftPercent ?? z.left_percent);
                const width = toNum(z.widthPercent ?? z.width_percent);
                const height = toNum(z.heightPercent ?? z.height_percent);
                const label = String(z.label ?? z.name ?? "").trim();

                if (![top, left, width, height].every((n) => Number.isFinite(n))) return null;

                const chars = getZoneCharacters(z);

                return (
                  <div
                    key={z.id}
                    className={activeZoneId === z.id ? "map-zone active" : "map-zone"}
                    style={{
                      top: `${top}%`,
                      left: `${left}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    title={label || "Zone"}
                    onPointerDown={(e) => onZonePointerDown(e, z, "move")}
                  >
                    {!isEditing && chars.length > 0 ? (
                      <div className="map-zone-characters">
                        {chars.map((c) => {
                          const nickname = getCharacterNickname(c);
                          const avatarUrl = getCharacterAvatarUrl(c);

                          return (
                            <div key={c.id ?? `${nickname}-${String(avatarUrl)}`} className="map-zone-character-card">
                              {avatarUrl ? <img className="map-zone-character-avatar" src={avatarUrl} alt={nickname || "avatar"} draggable={false} /> : null}
                              {nickname ? <div className="map-zone-character-nickname">{nickname}</div> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {isEditing ? <span className="map-zone-handle" onPointerDown={(e) => onZonePointerDown(e, z, "se")} /> : null}
                  </div>
                );
              })}
        </div>
      )}
    </div>
  );
}