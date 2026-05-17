// src/components/ZoneZoomOverlay.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clamp } from "../pages/map/utils/mapMath";
import { apiGetZoneCharacterPositions, apiSaveZoneCharacterPosition } from "../api/api";

function toNum(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function getZoneZoomStorageKey(zoneId) {
  return `zonezoom:${String(zoneId)}`;
}

function readSavedZoomFactor(zoneId) {
  if (!zoneId) return 1;
  try {
    const raw = window.localStorage.getItem(getZoneZoomStorageKey(zoneId));
    const value = Number(raw);
    return Number.isFinite(value) ? clamp(value, 0.2, 3) : 1;
  } catch {
    return 1;
  }
}

function saveZoomFactor(zoneId, value) {
  if (!zoneId) return;
  try {
    window.localStorage.setItem(getZoneZoomStorageKey(zoneId), String(clamp(Number(value), 0.2, 3)));
  } catch (e) {
    console.error("saveZoomFactor error:", e);
  }
}

export default function ZoneZoomOverlay({ img, zone, resolveUrl, token, onClose }) {
  const viewportRef = useRef(null);

  const [imgNatural, setImgNatural] = useState(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [viewportBox, setViewportBox] = useState({ w: 0, h: 0 });
  const [positions, setPositions] = useState({});
  const draggingRef = useRef(null);
  const [zoomFactor, setZoomFactor] = useState(() => readSavedZoomFactor(zone?.id));

  const z = useMemo(() => ({
    top: toNum(zone?.topPercent ?? zone?.top_percent),
    left: toNum(zone?.leftPercent ?? zone?.left_percent),
    width: toNum(zone?.widthPercent ?? zone?.width_percent),
    height: toNum(zone?.heightPercent ?? zone?.height_percent),
  }), [zone]);

  const zoneAspect = useMemo(() => {
    if (![z.width, z.height].every((n) => Number.isFinite(n)) || z.height <= 0) return "16/9";
    return `${clamp(z.width / z.height, 0.3, 3.5)}`;
  }, [z.width, z.height]);

  const getZoneCharacters = useCallback(() => {
    const candidates = zone?.characters ?? zone?.personnages ?? zone?.persons ?? zone?.members ?? zone?.zoneCharacters ?? zone?.zone_characters ?? [];
    return Array.isArray(candidates) ? candidates : [];
  }, [zone]);

  const getCharacterNickname = useCallback(
    (c) => String(c?.nickname ?? c?.surnom ?? c?.name ?? "").trim(), []
  );

  const getCharacterAvatarUrl = useCallback(
    (c) => {
      const raw = c?.avatarUrl ?? c?.avatar_url ?? c?.avatarPath ?? c?.avatar_path ?? c?.avatar;
      return resolveUrl(raw);
    },
    [resolveUrl]
  );

  // Bloque le scroll du body quand l'overlay est ouvert
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    setZoomFactor(readSavedZoomFactor(zone?.id));
  }, [zone?.id]);

  const computeCrop = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !imgNatural) return;
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
    if (vh > maxH) { vh = maxH; vw = Math.floor(vh * zoneRatio); }

    vw = Math.floor(vw * 0.98);
    vh = Math.floor(vh * 0.98);
    setViewportBox({ w: vw, h: vh });

    const scale = Math.max(1, Math.min(vw / zonePxW, vh / zonePxH)) * zoomFactor;
    let tx = -zonePxX * scale + (vw - zonePxW * scale) / 2;
    let ty = -zonePxY * scale + (vh - zonePxH * scale) / 2;

    const scaledImgW = imgNatural.w * scale;
    const scaledImgH = imgNatural.h * scale;

    tx = scaledImgW <= vw ? (vw - scaledImgW) / 2 : clamp(tx, vw - scaledImgW, 0);
    ty = scaledImgH <= vh ? (vh - scaledImgH) / 2 : clamp(ty, vh - scaledImgH, 0);

    setView({ scale, tx, ty });
  }, [imgNatural, z.top, z.left, z.width, z.height, zoomFactor]);

  // Charge les positions des personnages
  useEffect(() => {
    if (!token || !zone?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const list = await apiGetZoneCharacterPositions(token, zone.id);
        if (cancelled) return;

        const next = {};
        (Array.isArray(list) ? list : []).forEach((p) => {
          const cid = Number(p?.characterId ?? p?.character_id ?? p?.character?.id);
          const x = Number(p?.xPercent ?? p?.x_percent);
          const y = Number(p?.yPercent ?? p?.y_percent);
          if (Number.isFinite(cid) && Number.isFinite(x) && Number.isFinite(y)) {
            next[String(cid)] = { xPercent: x, yPercent: y };
          }
        });

        setPositions(next);
      } catch (e) {
        if (!cancelled) console.error("Erreur GET positions:", e);
      }
    })();

    return () => { cancelled = true; };
  }, [token, zone?.id]);

  const savePosition = useCallback(async (characterId, xPercent, yPercent) => {
    if (!token || !zone?.id) return;
    const cid = Number(characterId);
    if (!Number.isFinite(cid)) return;

    const x = clamp(Number(xPercent), 0, 100);
    const y = clamp(Number(yPercent), 0, 100);

    await apiSaveZoneCharacterPosition(token, zone.id, cid, x, y);
    setPositions((prev) => ({ ...prev, [String(cid)]: { xPercent: x, yPercent: y } }));
  }, [token, zone?.id]);

  const percentToViewportPx = useCallback((xPercent, yPercent) => {
    if (!imgNatural || ![z.top, z.left, z.width, z.height].every((n) => Number.isFinite(n))) return { x: 0, y: 0 };

    const zonePxW = (z.width / 100) * imgNatural.w;
    const zonePxH = (z.height / 100) * imgNatural.h;
    const zonePxX = (z.left / 100) * imgNatural.w;
    const zonePxY = (z.top / 100) * imgNatural.h;

    return {
      x: (zonePxX + (clamp(xPercent, 0, 100) / 100) * zonePxW) * view.scale + view.tx,
      y: (zonePxY + (clamp(yPercent, 0, 100) / 100) * zonePxH) * view.scale + view.ty,
    };
  }, [imgNatural, z.top, z.left, z.width, z.height, view.scale, view.tx, view.ty]);

  const viewportPxToPercent = useCallback((xPx, yPx) => {
    if (!imgNatural || ![z.top, z.left, z.width, z.height].every((n) => Number.isFinite(n))) return { xPercent: 50, yPercent: 50 };

    const zonePxW = (z.width / 100) * imgNatural.w;
    const zonePxH = (z.height / 100) * imgNatural.h;
    const zonePxX = (z.left / 100) * imgNatural.w;
    const zonePxY = (z.top / 100) * imgNatural.h;

    const imageX = (xPx - view.tx) / view.scale;
    const imageY = (yPx - view.ty) / view.scale;

    return {
      xPercent: clamp(((imageX - zonePxX) / zonePxW) * 100, 0, 100),
      yPercent: clamp(((imageY - zonePxY) / zonePxH) * 100, 0, 100),
    };
  }, [imgNatural, z.top, z.left, z.width, z.height, view.scale, view.tx, view.ty]);

  const onAvatarPointerDown = (e, characterId) => {
    e.preventDefault();
    e.stopPropagation();

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const pos = positions[String(characterId)] || { xPercent: 50, yPercent: 50 };
    const { x, y } = percentToViewportPx(pos.xPercent, pos.yPercent);

    draggingRef.current = {
      characterId: String(characterId),
      offsetX: e.clientX - rect.left - x,
      offsetY: e.clientY - rect.top - y,
      pointerId: e.pointerId,
    };

    viewport.setPointerCapture?.(e.pointerId);
  };

  const onViewportPointerMove = (e) => {
    const viewport = viewportRef.current;
    const d = draggingRef.current;
    if (!viewport || !d) return;

    const rect = viewport.getBoundingClientRect();
    const { xPercent, yPercent } = viewportPxToPercent(
      e.clientX - rect.left - d.offsetX,
      e.clientY - rect.top - d.offsetY
    );

    setPositions((prev) => ({ ...prev, [d.characterId]: { xPercent, yPercent } }));
  };

  const onViewportWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setZoomFactor((prev) => {
      const next = clamp(Number(e.deltaY > 0 ? prev * 0.9 : prev * 1.1), 0.2, 3);
      saveZoomFactor(zone?.id, next);
      return next;
    });
  }, [zone?.id]);

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

  const handleClose = useCallback(() => {
    saveZoomFactor(zone?.id, zoomFactor);
    onClose?.();
  }, [zone?.id, zoomFactor, onClose]);

  useEffect(() => {
    computeCrop();
    window.addEventListener("resize", computeCrop);
    return () => window.removeEventListener("resize", computeCrop);
  }, [computeCrop]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const chars = getZoneCharacters();

  return (
    <div className="zonezoom-overlay" onClick={handleClose}>
      <div className="zonezoom-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="zonezoom-close" onClick={handleClose}>
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
          onWheelCapture={onViewportWheel}
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
                    <img className="zonezoom-avatar-img" src={avatarUrl} alt={nickname || "avatar"} draggable={false} />
                  ) : (
                    <div className="zonezoom-avatar-fallback" />
                  )}
                  {nickname && <div className="zonezoom-avatar-label">{nickname}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}