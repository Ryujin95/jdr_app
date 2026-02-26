// src/pages/map/hooks/useZoneEditor.js
import { useCallback, useRef, useState } from "react";
import { API_URL } from "../../../config";
import { toNum, clampMove, clampResize } from "../../../utils/mapMath";

export function useZoneEditor({ token, isEditing, isMjInThisCampaign, zones, setZones, setError }) {
  const [activeZoneId, setActiveZoneId] = useState(null);
  const dragRef = useRef(null);

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

      return res.json().catch(() => null);
    },
    [token]
  );

  const onZonePointerDown = useCallback(
    (e, z, mode) => {
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
    },
    [isEditing, isMjInThisCampaign]
  );

  const onZonePointerMove = useCallback(
    (e) => {
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
    },
    [isEditing, isMjInThisCampaign, setZones]
  );

  const onZonePointerUp = useCallback(async () => {
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
      setError?.(err?.message || "Erreur update zone");
    }
  }, [isEditing, isMjInThisCampaign, zones, patchZone, setError]);

  return { activeZoneId, onZonePointerDown, onZonePointerMove, onZonePointerUp };
}