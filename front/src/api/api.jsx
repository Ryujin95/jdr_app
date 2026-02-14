// src/api/api.jsx
import { API_URL } from "../config";

const meCacheByToken = new Map();
const mePromiseByToken = new Map();

function hasFileLike(v) {
  if (!v) return false;
  if (typeof File !== "undefined" && v instanceof File) return true;
  if (typeof Blob !== "undefined" && v instanceof Blob) return true;
  return false;
}

function objectToFormData(obj) {
  const fd = new FormData();

  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null) return;
        fd.append(`${key}[]`, item);
      });
      return;
    }

    if (hasFileLike(value)) {
      fd.append(key, value);
      return;
    }

    fd.append(key, String(value));
  });

  return fd;
}

async function apiFetch(
  path,
  { token, method = "GET", body, signal, headers: extraHeaders } = {}
) {
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
    ...(isFormData || body === undefined ? {} : { "Content-Type": "application/json" }),
  };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
        ? body
        : JSON.stringify(body),
  });

  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const errJson = await res.json().catch(() => null);
      const msg =
        errJson && typeof errJson === "object"
          ? errJson.message || JSON.stringify(errJson)
          : null;
      throw new Error(msg || `HTTP ${res.status}`);
    }
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return res.text().catch(() => null);
  }

  return res.json();
}

/* ME */
export function apiGetMe(token, options = {}) {
  const { force = false, ...rest } = options;

  if (!token) return Promise.reject(new Error("Missing token"));

  if (!force && meCacheByToken.has(token)) return Promise.resolve(meCacheByToken.get(token));
  if (!force && mePromiseByToken.has(token)) return mePromiseByToken.get(token);

  const p = apiFetch("/me", { token, ...rest })
    .then((me) => {
      meCacheByToken.set(token, me);
      return me;
    })
    .finally(() => {
      mePromiseByToken.delete(token);
    });

  mePromiseByToken.set(token, p);
  return p;
}

export async function apiUpdateMe(token, data) {
  const me = await apiFetch("/me", { token, method: "PUT", body: data });
  if (token) meCacheByToken.set(token, me);
  return me;
}

export async function apiDeleteMe(token) {
  const out = await apiFetch("/me", { token, method: "DELETE" });
  if (token) {
    meCacheByToken.delete(token);
    mePromiseByToken.delete(token);
  }
  return out;
}

export function apiPrimeMe(token) {
  return apiGetMe(token).catch(() => null);
}

export function apiClearSessionCache(token) {
  if (token) {
    meCacheByToken.delete(token);
    mePromiseByToken.delete(token);
  } else {
    meCacheByToken.clear();
    mePromiseByToken.clear();
  }
}

/* CAMPAIGNS */
export function apiListCampaigns(token, options = {}) {
  return apiFetch("/campaigns", { token, ...options });
}

export function apiGetCampaign(token, id, options = {}) {
  return apiFetch(`/campaigns/${id}`, { token, ...options });
}

/**
 * Crée une campagne.
 * Accepte soit un FormData, soit un objet:
 * { title, theme, mapName, mapImage }  (mapImage = File)
 * IMPORTANT: les clés envoyées au back sont: title, theme, mapName, mapImage
 */
export function apiCreateCampaign(token, data) {
  return apiFetch("/campaigns", {
    token,
    method: "POST",
    body: data, // objet JS -> sera JSON.stringify par apiFetch
  });
}


export function apiJoinCampaign(token, code) {
  return apiFetch("/campaigns/join", {
    token,
    method: "POST",
    body: { code },
  });
}

/* CHARACTERS */
export function apiListCharacters(token, campaignId, options = {}) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(String(campaignId))}` : "";
  return apiFetch(`/characters${qs}`, { token, ...options });
}

export function apiGetCharacter(token, id, options = {}) {
  return apiFetch(`/characters/${id}`, { token, ...options });
}

/* MJ / RELATIONS */
export function apiGetKnownCharacters(token, fromCharacterId, campaignId) {
  return apiFetch(
    `/mj/characters/${fromCharacterId}/known?campaignId=${encodeURIComponent(String(campaignId))}`,
    { token }
  );
}

export function apiGetRelationCandidates(token, fromCharacterId, campaignId) {
  return apiFetch(
    `/mj/characters/${fromCharacterId}/candidates?campaignId=${encodeURIComponent(String(campaignId))}`,
    { token }
  );
}

export function apiAddKnownCharacter(token, fromCharacterId, campaignId, data) {
  return apiFetch(
    `/mj/characters/${fromCharacterId}/known?campaignId=${encodeURIComponent(String(campaignId))}`,
    { token, method: "POST", body: data }
  );
}

export function apiRemoveKnownCharacter(token, fromCharacterId, toCharacterId, campaignId) {
  return apiFetch(
    `/mj/characters/${fromCharacterId}/known/${toCharacterId}?campaignId=${encodeURIComponent(String(campaignId))}`,
    { token, method: "DELETE" }
  );
}

export function apiUpdateRelationshipStars(token, campaignId, fromCharacterId, toCharacterId, stars) {
  return apiFetch(`/mj/relationships?campaignId=${encodeURIComponent(String(campaignId))}`, {
    token,
    method: "PATCH",
    body: { fromCharacterId, toCharacterId, stars },
  });
}

export function apiDeleteCampaign(token, campaignId) {
  return apiFetch(`/campaigns/${campaignId}`, {
    token,
    method: "DELETE",
  });
}
