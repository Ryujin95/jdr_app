// src/pages/CampaignMapPage.jsx
import { useOutletContext } from "react-router-dom";
import { useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import "../CSS/MapPage.css";

// si tu as déjà ces fonctions dans api.jsx, garde-les.
// sinon enlève cet import et utilise fetch comme plus bas.
import { apiGetZoneCharacterPositions, apiSaveZoneCharacterPosition } from "../api/api";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

//#region ZoneZoomOverlay (crop + avatars draggables + save BD)
function ZoneZoomOverlay({ img, zone, toNum, resolveUrl, token, onClose }) {
  const viewportRef = useRef(null);

  const [imgNatural, setImgNatural] = useState(null); // {w,h}
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [viewportBox, setViewportBox] = useState({ w: 0, h: 0 });

  // positions par characterId: { [id]: { xPercent, yPercent } }
  const [positions, setPositions] = useState({});
  const draggingRef = useRef(null); // { characterId, offsetX, offsetY, pointerId }

  const z = useMemo(() => {
    const top = toNum(zone?.topPercent ?? zone?.top_percent);
    const left = toNum(zone?.leftPercent ?? zone?.left_percent);
    const width = toNum(zone?.widthPercent ?? zone?.width_percent);
    const height = toNum(zone?.heightPercent ?? zone?.height_percent);
    return { top, left, width, height };
  }, [zone, toNum]);

  const zoneAspect = useMemo(() => {
    if (![z.width, z.height].every((n) => Number.isFinite(n)) || z.height <= 0) return "16/9";
    const r = z.width / z.height;
    const safe = clamp(r, 0.3, 3.5);
    return `${safe}`;
  }, [z.width, z.height]);

  const getZoneCharacters = useCallback(() => {
    const candidates =
      zone?.characters ??
      zone?.personnages ??
      zone?.persons ??
      zone?.members ??
      zone?.zoneCharacters ??
      zone?.zone_characters ??
      [];
    return Array.isArray(candidates) ? candidates : [];
  }, [zone]);

  const getCharacterNickname = useCallback(
    (c) => String(c?.nickname ?? c?.surnom ?? c?.name ?? "").trim(),
    []
  );

  const getCharacterAvatarUrl = useCallback(
    (c) => {
      const raw = c?.avatarUrl ?? c?.avatar_url ?? c?.avatarPath ?? c?.avatar_path ?? c?.avatar;
      return resolveUrl(raw);
    },
    [resolveUrl]
  );

  const computeCrop = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (!imgNatural) return;
    if (![z.top, z.left, z.width, z.height].every((n) => Number.isFinite(n))) return;

    const zonePxW = (z.width / 100) * imgNatural.w;
    const zonePxH = (z.height / 100) * imgNatural.h;
    const zonePxX = (z.left / 100) * imgNatural.w;
    const zonePxY = (z.top / 100) * imgNatural.h;

    if (zonePxW <= 0 || zonePxH <= 0) return;

    const zoneRatio = zonePxW / zonePxH;

    const maxW = Math.floor(window.innerWidth * 0.9);
    const maxH = Math.floor(window.innerHeight * 0.8);

    let vw = maxW;
    let vh = Math.floor(vw / zoneRatio);

    if (vh > maxH) {
      vh = maxH;
      vw = Math.floor(vh * zoneRatio);
    }

    vw = Math.floor(vw * 0.98);
    vh = Math.floor(vh * 0.98);

    setViewportBox({ w: vw, h: vh });

    const scale = clamp(vw / zonePxW, 1, 4);
    const tx = -zonePxX * scale;
    const ty = -zonePxY * scale;

    setView({ scale, tx, ty });
  }, [imgNatural, z.top, z.left, z.width, z.height]);

  // GET positions en BD (par zone)
  useEffect(() => {
    if (!token) return;
    if (!zone?.id) return;

    let cancelled = false;

    (async () => {
      try {
        // priorité à api.jsx si tu l’as
        if (typeof apiGetZoneCharacterPositions === "function") {
          const list = await apiGetZoneCharacterPositions(token, zone.id);
          if (cancelled) return;

          const next = {};
          (Array.isArray(list) ? list : []).forEach((p) => {
            const cid = p?.characterId ?? p?.character_id ?? p?.character?.id;
            const x = p?.xPercent ?? p?.x_percent;
            const y = p?.yPercent ?? p?.y_percent;

            const cIdNum = Number(cid);
            const xNum = Number(x);
            const yNum = Number(y);

            if (Number.isFinite(cIdNum) && Number.isFinite(xNum) && Number.isFinite(yNum)) {
              next[String(cIdNum)] = { xPercent: xNum, yPercent: yNum };
            }
          });

          setPositions(next);
          return;
        }

        // fallback fetch (au cas où tu n’as pas la fonction api.jsx)
        const res = await fetch(`${API_URL}/character-zone-positions?zoneId=${encodeURIComponent(String(zone.id))}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json().catch(() => []);
        const list = Array.isArray(data) ? data : [];

        const next = {};
        for (const row of list) {
          const cid = row?.characterId ?? row?.character_id ?? row?.character?.id;
          const x = row?.xPercent ?? row?.x_percent;
          const y = row?.yPercent ?? row?.y_percent;

          const cIdNum = Number(cid);
          const xNum = Number(x);
          const yNum = Number(y);

          if (Number.isFinite(cIdNum) && Number.isFinite(xNum) && Number.isFinite(yNum)) {
            next[String(cIdNum)] = { xPercent: xNum, yPercent: yNum };
          }
        }

        if (!cancelled) setPositions(next);
      } catch (e) {
        if (!cancelled) console.error("Erreur GET positions:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, zone?.id]);

  // SAVE position (PATCH) via ton endpoint Symfony: /zones/{zoneId}/characters/{characterId}/position
  const savePosition = useCallback(
    async (characterId, xPercent, yPercent) => {
      if (!token) return;
      if (!zone?.id) return;

      const cid = Number(characterId);
      if (!Number.isFinite(cid)) return;

      const x = clamp(Number(xPercent), 0, 100);
      const y = clamp(Number(yPercent), 0, 100);

      // priorité à api.jsx si tu l’as
      if (typeof apiSaveZoneCharacterPosition === "function") {
        await apiSaveZoneCharacterPosition(token, zone.id, cid, x, y);
        setPositions((prev) => ({ ...prev, [String(cid)]: { xPercent: x, yPercent: y } }));
        return;
      }

      // fallback fetch
      const res = await fetch(
        `${API_URL}/zones/${encodeURIComponent(String(zone.id))}/characters/${encodeURIComponent(String(cid))}/position`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ xPercent: x, yPercent: y }),
        }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }

      setPositions((prev) => ({ ...prev, [String(cid)]: { xPercent: x, yPercent: y } }));
    },
    [token, zone?.id]
  );

  const percentToViewportPx = useCallback(
    (xPercent, yPercent) => {
      const vw = viewportBox.w || 0;
      const vh = viewportBox.h || 0;
      const x = (clamp(xPercent, 0, 100) / 100) * vw;
      const y = (clamp(yPercent, 0, 100) / 100) * vh;
      return { x, y };
    },
    [viewportBox.w, viewportBox.h]
  );

  const viewportPxToPercent = useCallback(
    (xPx, yPx) => {
      const vw = viewportBox.w || 1;
      const vh = viewportBox.h || 1;
      const xPercent = clamp((xPx / vw) * 100, 0, 100);
      const yPercent = clamp((yPx / vh) * 100, 0, 100);
      return { xPercent, yPercent };
    },
    [viewportBox.w, viewportBox.h]
  );

  const onAvatarPointerDown = (e, characterId) => {
    e.preventDefault();
    e.stopPropagation();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();

    const current = positions[String(characterId)] || { xPercent: 50, yPercent: 50 };
    const { x, y } = percentToViewportPx(current.xPercent, current.yPercent);

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    draggingRef.current = {
      characterId: String(characterId),
      offsetX: pointerX - x,
      offsetY: pointerY - y,
      pointerId: e.pointerId,
    };

    viewport.setPointerCapture?.(e.pointerId);
  };

  const onViewportPointerMove = (e) => {
    const viewport = viewportRef.current;
    const d = draggingRef.current;
    if (!viewport || !d) return;

    const rect = viewport.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const xPx = pointerX - d.offsetX;
    const yPx = pointerY - d.offsetY;

    const { xPercent, yPercent } = viewportPxToPercent(xPx, yPx);

    setPositions((prev) => ({
      ...prev,
      [d.characterId]: { xPercent, yPercent },
    }));
  };

  const onViewportPointerUp = async () => {
    const d = draggingRef.current;
    if (!d) return;
    draggingRef.current = null;

    const pos = positions[d.characterId];
    if (!pos) return;

    try {
      await savePosition(d.characterId, pos.xPercent, pos.yPercent);
    } catch (e) {
      console.error("Erreur SAVE position:", e);
    }
  };

  useEffect(() => {
    computeCrop();
    const onResize = () => computeCrop();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeCrop]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chars = getZoneCharacters();

  return (
    <div className="zonezoom-overlay" onClick={onClose}>
      <div className="zonezoom-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="zonezoom-close" onClick={onClose}>
          Fermer
        </button>

        <div
          ref={viewportRef}
          className="zonezoom-viewport zonezoom-viewport--interactive"
          style={{
            width: viewportBox.w ? `${viewportBox.w}px` : undefined,
            height: viewportBox.h ? `${viewportBox.h}px` : undefined,
            aspectRatio: zoneAspect,
          }}
          onPointerMove={onViewportPointerMove}
          onPointerUp={onViewportPointerUp}
          onPointerCancel={onViewportPointerUp}
        >
          <img
            className="zonezoom-img"
            src={img}
            alt="zone"
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget;
              setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
              setTimeout(() => computeCrop(), 0);
            }}
            style={{
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
              transformOrigin: "top left",
            }}
          />

          <div className="zonezoom-avatars-layer">
            {chars.map((c) => {
              const characterId = c?.id;
              if (!characterId) return null;

              const nickname = getCharacterNickname(c);
              const avatarUrl = getCharacterAvatarUrl(c);

              const pos = positions[String(characterId)] || { xPercent: 50, yPercent: 50 };
              const { x, y } = percentToViewportPx(pos.xPercent, pos.yPercent);

              return (
                <div
                  key={characterId}
                  className="zonezoom-avatar"
                  style={{ left: `${x}px`, top: `${y}px` }}
                  onPointerDown={(e) => onAvatarPointerDown(e, characterId)}
                  role="button"
                  tabIndex={0}
                >
                  {avatarUrl ? (
                    <img
                      className="zonezoom-avatar-img"
                      src={avatarUrl}
                      alt={nickname || "avatar"}
                      draggable={false}
                    />
                  ) : (
                    <div className="zonezoom-avatar-fallback" />
                  )}
                  {nickname ? <div className="zonezoom-avatar-label">{nickname}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
//#endregion

export default function CampaignMapPage() {
  const outlet = useOutletContext() || {};
  const campaignId = outlet?.campaignId ? String(outlet.campaignId) : null;

  // ✅ même système que tes onglets: seuls les MJ voient les boutons/actions
  const isMjInThisCampaign = !!outlet?.isMjInThisCampaign;

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

  const [zoomZone, setZoomZone] = useState(null);

  // ✅ sécurité: si pas MJ, pas de panel/édition
  useEffect(() => {
    if (!isMjInThisCampaign) {
      setIsEditing(false);
      setPanel(null);
    }
  }, [isMjInThisCampaign]);

  //#region helpers urls + parsing
  const BACK_BASE_URL = useMemo(() => API_URL.replace(/\/api\/?$/, ""), []);

  const resolveUrl = useCallback(
    (path) => {
      if (!path) return null;
      const url = String(path).trim();
      if (!url) return null;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("/")) return `${BACK_BASE_URL}${url}`;
      return `${BACK_BASE_URL}/${url}`;
    },
    [BACK_BASE_URL]
  );

  const toNum = (v) => {
    if (v === null || v === undefined) return NaN;
    if (typeof v === "number") return v;
    const s = String(v).trim().replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const clamp2 = (v, min, max) => Math.max(min, Math.min(max, v));

  const clampMove = (top, left, width, height) => {
    const t = clamp2(top, 0, Math.max(0, 100 - height));
    const l = clamp2(left, 0, Math.max(0, 100 - width));
    return { top: t, left: l };
  };

  const clampResize = (top, left, width, height) => {
    const w = clamp2(width, 1, Math.max(1, 100 - left));
    const h = clamp2(height, 1, Math.max(1, 100 - top));
    return { width: w, height: h };
  };
  //#endregion

  //#region fetch map
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
  //#endregion

  //#region API zones/locations
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
  //#endregion

  //#region edit zones interactions
  const onZonePointerDown = (e, z, mode) => {
    if (!isEditing) return;
    if (!isMjInThisCampaign) return;

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
    if (!isMjInThisCampaign) return;

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
    if (!isMjInThisCampaign) return;

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
  //#endregion

  //#region create/delete location
  const handleCreateLocationAndZone = async (e) => {
    e.preventDefault();
    setError("");

    if (!isMjInThisCampaign) return;
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

    if (!isMjInThisCampaign) return;
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
  //#endregion

  //#region open/close zoom
  const img = resolveUrl(mapData?.imagePath);

  const openZoneZoom = (z) => {
    if (!img) return;
    if (isEditing) return;
    setZoomZone(z);
  };

  const closeZoneZoom = () => setZoomZone(null);
  //#endregion

  //#region early returns
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
  //#endregion

  return (
    <div className="map-page">
      <div className="map-header">
        <h1 className="map-title">{mapData?.name ? `Carte : ${mapData.name}` : "Carte"}</h1>

        {/* ✅ boutons MJ uniquement */}
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

      {/* ✅ panels MJ uniquement */}
      {isMjInThisCampaign && panel === "create" ? (
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

      {isMjInThisCampaign && panel === "delete" ? (
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
            <button
              type="button"
              className="map-edit-btn active"
              onClick={handleDeleteLocationToTrash}
              disabled={!selectedLocationId || locations.length === 0}
            >
              Envoyer à la corbeille
            </button>
          </div>
        </div>
      ) : null}

      {!img ? (
        <div className="map-empty">Map sans image.</div>
      ) : (
        <div
          className={
            isEditing && isMjInThisCampaign
              ? "map-container map-container--relative editing"
              : "map-container map-container--relative"
          }
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
                    onPointerDown={(e) => (isMjInThisCampaign ? onZonePointerDown(e, z, "move") : undefined)}
                    onClick={() => openZoneZoom(z)}
                    role="button"
                    tabIndex={0}
                  >
                    {/* mini avatars dans la zone (player OK) */}
                    {!isEditing && list.length > 0 ? (
                      <div className="map-zone-characters">
                        {list.map((c) => {
                          const nickname = String(c?.nickname ?? c?.surnom ?? c?.name ?? "").trim();
                          const avatar = resolveUrl(
                            c?.avatarUrl ?? c?.avatar_url ?? c?.avatarPath ?? c?.avatar_path ?? c?.avatar
                          );

                          return (
                            <div key={c.id ?? `${nickname}-${String(avatar)}`} className="map-zone-character-card">
                              {avatar ? (
                                <img
                                  className="map-zone-character-avatar"
                                  src={avatar}
                                  alt={nickname || "avatar"}
                                  draggable={false}
                                />
                              ) : null}
                              {nickname ? <div className="map-zone-character-nickname">{nickname}</div> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* handle resize MJ uniquement */}
                    {isEditing && isMjInThisCampaign ? (
                      <span className="map-zone-handle" onPointerDown={(e) => onZonePointerDown(e, z, "se")} />
                    ) : null}
                  </div>
                );
              })}
        </div>
      )}

      {zoomZone && img ? (
        <ZoneZoomOverlay
          img={img}
          zone={zoomZone}
          toNum={toNum}
          resolveUrl={resolveUrl}
          token={token}
          onClose={closeZoneZoom}
        />
      ) : null}
    </div>
  );
}