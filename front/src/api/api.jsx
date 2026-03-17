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

export function apiGetAssignablePlayers(token, campaignId, options = {}) {
  if (!campaignId) return Promise.resolve([]);
  return apiFetch(
    `/campaigns/${encodeURIComponent(String(campaignId))}/assignable-players`,
    { token, method: "GET", ...options }
  ).then((data) => (Array.isArray(data) ? data : []));
}

/* CHARACTERS */
export function apiListCharacters(token, campaignId, options = {}) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(String(campaignId))}` : "";
  return apiFetch(`/characters${qs}`, { token, ...options });
}

export function apiGetCharacter(token, id, options = {}) {
  return apiFetch(`/characters/${id}`, { token, ...options });
}

export function apiListLocationsForCharacter(token, characterId, options = {}) {
  return apiFetch(`/characters/${encodeURIComponent(String(characterId))}/locations`, {
    token,
    method: "GET",
    ...options,
  }).then((data) => (Array.isArray(data) ? data : []));
}

export function apiGetAdminCharacter(token, id, options = {}) {
  return apiFetch(`/admin/characters/${encodeURIComponent(String(id))}`, {
    token,
    method: "GET",
    ...options,
  });
}

export function apiUpdateCharacter(token, id, formData, options = {}) {
  return apiFetch(`/characters/${encodeURIComponent(String(id))}`, {
    token,
    method: "POST",
    body: formData,
    ...options,
  });
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

/* MAPS */
export function apiListMaps(token, campaignId, options = {}) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(String(campaignId))}` : "";
  return apiFetch(`/maps${qs}`, { token, ...options });
}

export function apiCreateMap(token, campaignId, data, options = {}) {
  // data attendu: { name, imageUrl?, description?, enabled?, zones? }
  return apiFetch(`/maps`, {
    token,
    method: "POST",
    body: {
      campaignId: Number(campaignId),
      ...data,
    },
    ...options,
  });
}

export function apiDeleteMap(token, mapId, options = {}) {
  return apiFetch(`/maps/${mapId}`, {
    token,
    method: "DELETE",
    ...options,
  });
}

export function apiSaveZoneCharacterPosition(token, zoneId, characterId, xPercent, yPercent, options = {}) {
  return apiFetch(`/zones/${encodeURIComponent(String(zoneId))}/characters/${encodeURIComponent(String(characterId))}/position`, {
    token,
    method: "PATCH",
    body: { xPercent, yPercent },
    ...options,
  });
}

export function apiGetZoneCharacterPositions(token, zoneId, options = {}) {
  return apiFetch(
    `/zones/${encodeURIComponent(String(zoneId))}/characters/positions`,
    { token, ...options }
  );
}

export function apiLeaveCampaign(token, campaignId, options = {}) {
  return apiFetch(`/campaigns/${encodeURIComponent(String(campaignId))}/leave`, {
    token,
    method: "DELETE",
    ...options,
  }).then(() => true);
}

export function apiGetCampaignMembers(token, campaignId, options = {}) {
  return apiFetch(`/campaigns/${encodeURIComponent(String(campaignId))}/members`, {
    token,
    method: "GET",
    ...options,
  }).then((data) => (Array.isArray(data) ? data : []));
}

export function apiTransferCampaignMj(token, campaignId, userId, options = {}) {
  return apiFetch(`/campaigns/${encodeURIComponent(String(campaignId))}/transfer-mj`, {
    token,
    method: "PUT",
    body: { userId },
    ...options,
  }).then(() => true);
}

/* USERS */
export function apiListUsers(token, options = {}) {
  return apiFetch(`/users`, { token, ...options })
    .then((data) => (Array.isArray(data) ? data : []));
}

export function apiGetUserProfile(token, userId, options = {}) {
  return apiFetch(`/users/${encodeURIComponent(String(userId))}/profile`, {
    token,
    ...options,
  });
}

export function apiSearchUsers(token, q, options = {}) {
  const qs = `?q=${encodeURIComponent(String(q || ""))}`;
  return apiFetch(`/users/search${qs}`, { token, ...options })
    .then((data) => (Array.isArray(data) ? data : []));
}

export function apiListFriends(token, options = {}) {
  return apiFetch(`/friends`, { token, ...options }).then((data) =>
    Array.isArray(data) ? data : []
  );
}

export function apiListFriendRequests(token, options = {}) {
  return apiFetch(`/friends/requests`, { token, ...options }).then((data) => {
    const incoming = Array.isArray(data?.incoming) ? data.incoming : [];
    const outgoing = Array.isArray(data?.outgoing) ? data.outgoing : [];
    return { incoming, outgoing };
  });
}

export function apiSendFriendRequest(token, userId, options = {}) {
  return apiFetch(`/friends/request`, {
    token,
    method: "POST",
    body: { userId },
    ...options,
  });
}

export function apiAcceptFriendRequest(token, friendshipId, options = {}) {
  return apiFetch(`/friends/${encodeURIComponent(String(friendshipId))}/accept`, {
    token,
    method: "POST",
    ...options,
  });
}

export function apiDeclineFriendRequest(token, friendshipId, options = {}) {
  return apiFetch(`/friends/${encodeURIComponent(String(friendshipId))}/decline`, {
    token,
    method: "POST",
    ...options,
  });
}

export function apiRemoveFriend(token, otherUserId, options = {}) {
  return apiFetch(`/friends/${encodeURIComponent(String(otherUserId))}`, {
    token,
    method: "DELETE",
    ...options,
  }).then(() => true);
}

export function apiGetFriendProfile(token, otherUserId, options = {}) {
  return apiFetch(`/friends/${encodeURIComponent(String(otherUserId))}/profile`, {
    token,
    method: "GET",
    ...options,
  });
}

/* ADMIN / KNOWLEDGE (MJ only) */

// GET /api/admin/knowledge/state?characterId=...&field=...
export function apiGetKnowledgeState(token, characterId, field, options = {}) {
  const qs = `?characterId=${encodeURIComponent(String(characterId))}&field=${encodeURIComponent(String(field))}`;
  return apiFetch(`/admin/knowledge/state${qs}`, { token, method: "GET", ...options });
}

// GET /api/admin/knowledge/can-view?viewerId=...&characterId=...&field=...
export function apiCanViewKnowledge(token, viewerId, characterId, field, options = {}) {
  const qs =
    `?viewerId=${encodeURIComponent(String(viewerId))}` +
    `&characterId=${encodeURIComponent(String(characterId))}` +
    `&field=${encodeURIComponent(String(field))}`;
  return apiFetch(`/admin/knowledge/can-view${qs}`, { token, method: "GET", ...options });
}

// POST /api/admin/knowledge/grant
export function apiGrantKnowledge(token, data, options = {}) {
  // data attendu: { viewerId, characterId, field, knowledgeLevel?: "full", notes?: string|null }
  return apiFetch(`/admin/knowledge/grant`, { token, method: "POST", body: data, ...options });
}

// POST /api/admin/knowledge/revoke
export function apiRevokeKnowledge(token, data, options = {}) {
  // data attendu: { viewerId, characterId, field }
  return apiFetch(`/admin/knowledge/revoke`, { token, method: "POST", body: data, ...options });
}

export function apiUpdateZone(token, zoneId, data, options = {}) {
  return apiFetch(`/zones/${encodeURIComponent(String(zoneId))}`, {
    token,
    method: "PATCH",
    body: data,
    ...options,
  });
}