// src/pages/map/hooks/useZoneEditor.js
import { useCallback, useRef, useState } from "react";
import { toNum, clampMove, clampResize } from "../utils/mapMath";
import { apiUpdateZone } from "../../../api/api";

export function useZoneEditor({
  token,
  isEditing,
  isMjInThisCampaign,
  zones,
  setZones,
  setError,
}) {
  const [activeZoneId, setActiveZoneId] = useState(null);
  const dragRef = useRef(null);

  const onZonePointerDown = useCallback((e, z, mode) => {
    if (!isEditing || !isMjInThisCampaign) return;

    e.preventDefault();
    e.stopPropagation();

    setActiveZoneId(z.id);

    const container = e.currentTarget.closest(".map-container");
    if (!container) return;

    dragRef.current = {
      id: z.id,
      mode,
      rect: container.getBoundingClientRect(),
      startX: e.clientX,
      startY: e.clientY,
      startTop: toNum(z.topPercent ?? z.top_percent),
      startLeft: toNum(z.leftPercent ?? z.left_percent),
      startWidth: toNum(z.widthPercent ?? z.width_percent),
      startHeight: toNum(z.heightPercent ?? z.height_percent),
    };

    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [isEditing, isMjInThisCampaign]);

  const onZonePointerMove = useCallback((e) => {
    if (!isEditing || !isMjInThisCampaign) return;

    const d = dragRef.current;
    if (!d) return;

    const dxPct = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dyPct = ((e.clientY - d.startY) / d.rect.height) * 100;

    setZones((prev) =>
      prev.map((zz) => {
        if (zz.id !== d.id) return zz;

        const top = toNum(zz.topPercent ?? zz.top_percent);
        const left = toNum(zz.leftPercent ?? zz.left_percent);
        const width = toNum(zz.widthPercent ?? zz.width_percent);
        const height = toNum(zz.heightPercent ?? zz.height_percent);

        if (![top, left, width, height].every((n) => Number.isFinite(n))) return zz;

        if (d.mode === "move") {
          const { top: nt, left: nl } = clampMove(d.startTop + dyPct, d.startLeft + dxPct, width, height);
          return { ...zz, topPercent: nt, leftPercent: nl };
        }

        if (d.mode === "se") {
          const { width: nw, height: nh } = clampResize(top, left, d.startWidth + dxPct, d.startHeight + dyPct);
          return { ...zz, widthPercent: nw, heightPercent: nh };
        }

        return zz;
      })
    );
  }, [isEditing, isMjInThisCampaign, setZones]);

  const onZonePointerUp = useCallback(async () => {
    if (!isEditing || !isMjInThisCampaign) return;

    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;

    const z = zones.find((x) => x.id === d.id);
    if (!z) return;

    try {
      await apiUpdateZone(token, d.id, {
        topPercent: toNum(z.topPercent ?? z.top_percent),
        leftPercent: toNum(z.leftPercent ?? z.left_percent),
        widthPercent: toNum(z.widthPercent ?? z.width_percent),
        heightPercent: toNum(z.heightPercent ?? z.height_percent),
      });
    } catch (err) {
      setError?.(err?.message || "Erreur update zone");
    }
  }, [isEditing, isMjInThisCampaign, zones, token, setError]);

  return { activeZoneId, onZonePointerDown, onZonePointerMove, onZonePointerUp };
}