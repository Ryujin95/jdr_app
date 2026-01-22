// src/api/api.jsx

import { API_URL } from "../config";

/**
 * ✅ MODIF: petit cache mémoire + déduplication des appels /me
 * Objectif: si plusieurs composants demandent /me, on ne fait qu'un seul fetch
 * et on renvoie la même Promise à tout le monde.
 */
const meCacheByToken = new Map();      // token -> me object
const mePromiseByToken = new Map();    // token -> Promise<me>

/**
 * Helper fetch avec JWT
 */
async function apiFetch(path, { token, method = "GET", body, signal, headers: extraHeaders } = {}) {
  // ✅ MODIF: construire les headers sans mettre de clés à undefined
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(extraHeaders || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    signal,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // ✅ MODIF: message d'erreur plus lisible (ton back renvoie souvent du JSON ou un message)
    throw new Error(text || `HTTP ${res.status}`);
  }

  // 204 = no content
  if (res.status === 204) return null;

  // ✅ MODIF: éviter un crash si la réponse n'est pas JSON (rare mais possible)
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return res.text().catch(() => null);
  }

  return res.json();
}

/* ─────────────────────────────
   ME
───────────────────────────── */

/**
 * ✅ MODIF: /me devient "bootstrap":
 * - cache mémoire immédiat si déjà connu
 * - déduplication si déjà en cours
 * - option force pour bypass cache
 */
export function apiGetMe(token, options = {}) {
  const { force = false, ...rest } = options;

  if (!token) return Promise.reject(new Error("Missing token"));

  if (!force && meCacheByToken.has(token)) {
    return Promise.resolve(meCacheByToken.get(token));
  }

  if (!force && mePromiseByToken.has(token)) {
    return mePromiseByToken.get(token);
  }

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

/**
 * ✅ MODIF: quand tu updates /me, on met à jour le cache mémoire pour éviter un "retour arrière" UI
 */
export async function apiUpdateMe(token, data) {
  const me = await apiFetch("/me", {
    token,
    method: "PUT",
    body: data,
  });

  if (token) meCacheByToken.set(token, me);
  return me;
}

/**
 * ✅ MODIF: quand tu deletes /me (compte), on nettoie les caches
 */
export async function apiDeleteMe(token) {
  const out = await apiFetch("/me", {
    token,
    method: "DELETE",
  });

  if (token) {
    meCacheByToken.delete(token);
    mePromiseByToken.delete(token);
  }

  return out;
}

/**
 * ✅ MODIF: helper facultatif si tu veux "précharger" /me dès que tu as un token
 * (par exemple juste après login, ou au montage de l'app)
 */
export function apiPrimeMe(token) {
  return apiGetMe(token).catch(() => null);
}

/**
 * ✅ MODIF: helper pour vider le cache quand tu logout
 */
export function apiClearSessionCache(token) {
  if (token) {
    meCacheByToken.delete(token);
    mePromiseByToken.delete(token);
  } else {
    meCacheByToken.clear();
    mePromiseByToken.clear();
  }
}

/* ─────────────────────────────
   CAMPAIGNS
───────────────────────────── */

export function apiListCampaigns(token, options = {}) {
  return apiFetch("/campaigns", { token, ...options });
}

export function apiGetCampaign(token, id, options = {}) {
  return apiFetch(`/campaigns/${id}`, { token, ...options });
}

export function apiCreateCampaign(token, data) {
  return apiFetch("/campaigns", {
    token,
    method: "POST",
    body: data,
  });
}

export function apiJoinCampaign(token, code) {
  return apiFetch("/campaigns/join", {
    token,
    method: "POST",
    body: { code },
  });
}

/* ─────────────────────────────
   CHARACTERS
───────────────────────────── */

export function apiListCharacters(token, campaignId, options = {}) {
  // ✅ MODIF: encodeURIComponent par sécurité
  const qs = campaignId ? `?campaignId=${encodeURIComponent(String(campaignId))}` : "";
  return apiFetch(`/characters${qs}`, { token, ...options });
}

export function apiGetCharacter(token, id, options = {}) {
  return apiFetch(`/characters/${id}`, { token, ...options });
}

/* ─────────────────────────────
   MJ / RELATIONS
───────────────────────────── */

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
    {
      token,
      method: "POST",
      body: data,
    }
  );
}

export function apiRemoveKnownCharacter(token, fromCharacterId, toCharacterId, campaignId) {
  return apiFetch(
    `/mj/characters/${fromCharacterId}/known/${toCharacterId}?campaignId=${encodeURIComponent(String(campaignId))}`,
    {
      token,
      method: "DELETE",
    }
  );
}

export function apiUpdateRelationshipStars(token, campaignId, fromCharacterId, toCharacterId, stars) {
  return apiFetch(`/mj/relationships?campaignId=${encodeURIComponent(String(campaignId))}`, {
    token,
    method: "PATCH",
    body: {
      fromCharacterId,
      toCharacterId,
      stars,
    },
  });
}
