// src/utils/mapMath.js
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function toNum(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function clamp2(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function clampMove(top, left, width, height) {
  const t = clamp2(top, 0, Math.max(0, 100 - height));
  const l = clamp2(left, 0, Math.max(0, 100 - width));
  return { top: t, left: l };
}

export function clampResize(top, left, width, height) {
  const w = clamp2(width, 1, Math.max(1, 100 - left));
  const h = clamp2(height, 1, Math.max(1, 100 - top));
  return { width: w, height: h };
}