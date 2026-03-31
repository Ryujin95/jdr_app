// src/api/api.jsx
import { API_URL } from "../config";

const meCacheByToken = new Map();
const mePromiseByToken = new Map();

const toArray = (data) => (Array.isArray(data) ? data : []);
const okTrue = () => true;

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
    ...(isFormData || body === undefined
      ? {}
      : { "Content-Type": "application/json" }),
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

export async function apiUpdateMe(token, data) {
  const me = await apiFetch("/me", { token, method: "PUT", body: data });
  if (token) meCacheByToken.set(token, me);
  return me;
}

export async function apiUploadMeAvatar(token, file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const me = await apiFetch("/me", {
    token,
    method: "POST",
    body: formData,
  });

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
    return;
  }

  meCacheByToken.clear();
  mePromiseByToken.clear();
}

/* CAMPAIGNS */
export const apiListCampaigns = (token, options = {}) =>
  apiFetch("/campaigns", { token, ...options });

export const apiGetCampaign = (token, id, options = {}) =>
  apiFetch(`/campaigns/${id}`, { token, ...options });

export const apiCreateCampaign = (token, data) =>
  apiFetch("/campaigns", {
    token,
    method: "POST",
    body: data,
  });

export const apiJoinCampaign = (token, code) =>
  apiFetch("/campaigns/join", {
    token,
    method: "POST",
    body: { code },
  });

export const apiGetAssignablePlayers = (token, campaignId, options = {}) =>
  !campaignId
    ? Promise.resolve([])
    : apiFetch(
        `/campaigns/${encodeURIComponent(String(campaignId))}/assignable-players`,
        { token, method: "GET", ...options }
      ).then(toArray);

export const apiDeleteCampaign = (token, campaignId) =>
  apiFetch(`/campaigns/${campaignId}`, {
    token,
    method: "DELETE",
  });

export const apiLeaveCampaign = (token, campaignId, options = {}) =>
  apiFetch(`/campaigns/${encodeURIComponent(String(campaignId))}/leave`, {
    token,
    method: "DELETE",
    ...options,
  }).then(okTrue);

export const apiGetCampaignMembers = (token, campaignId, options = {}) =>
  apiFetch(`/campaigns/${encodeURIComponent(String(campaignId))}/members`, {
    token,
    method: "GET",
    ...options,
  }).then(toArray);

export const apiTransferCampaignMj = (token, campaignId, userId, options = {}) =>
  apiFetch(`/campaigns/${encodeURIComponent(String(campaignId))}/transfer-mj`, {
    token,
    method: "PUT",
    body: { userId },
    ...options,
  }).then(okTrue);

/* CHARACTERS */
export function apiListCharacters(token, campaignId, options = {}) {
  const qs = campaignId
    ? `?campaignId=${encodeURIComponent(String(campaignId))}`
    : "";
  return apiFetch(`/characters${qs}`, { token, ...options });
}

export const apiGetCharacter = (token, id, options = {}) =>
  apiFetch(`/characters/${id}`, { token, ...options });

export const apiListLocationsForCharacter = (
  token,
  characterId,
  options = {}
) =>
  apiFetch(`/characters/${encodeURIComponent(String(characterId))}/locations`, {
    token,
    method: "GET",
    ...options,
  }).then(toArray);

export const apiGetAdminCharacter = (token, id, options = {}) =>
  apiFetch(`/admin/characters/${encodeURIComponent(String(id))}`, {
    token,
    method: "GET",
    ...options,
  });

export const apiUpdateCharacter = (token, id, formData, options = {}) =>
  apiFetch(`/characters/${encodeURIComponent(String(id))}`, {
    token,
    method: "POST",
    body: formData,
    ...options,
  });

/* MJ / RELATIONS */
export const apiGetKnownCharacters = (token, fromCharacterId, campaignId) =>
  apiFetch(
    `/mj/characters/${fromCharacterId}/known?campaignId=${encodeURIComponent(
      String(campaignId)
    )}`,
    { token }
  );

export const apiGetRelationCandidates = (token, fromCharacterId, campaignId) =>
  apiFetch(
    `/mj/characters/${fromCharacterId}/candidates?campaignId=${encodeURIComponent(
      String(campaignId)
    )}`,
    { token }
  );

export const apiAddKnownCharacter = (token, fromCharacterId, campaignId, data) =>
  apiFetch(
    `/mj/characters/${fromCharacterId}/known?campaignId=${encodeURIComponent(
      String(campaignId)
    )}`,
    { token, method: "POST", body: data }
  );

export const apiRemoveKnownCharacter = (
  token,
  fromCharacterId,
  toCharacterId,
  campaignId
) =>
  apiFetch(
    `/mj/characters/${fromCharacterId}/known/${toCharacterId}?campaignId=${encodeURIComponent(
      String(campaignId)
    )}`,
    { token, method: "DELETE" }
  );

export const apiUpdateRelationshipStars = (
  token,
  campaignId,
  fromCharacterId,
  toCharacterId,
  stars
) =>
  apiFetch(`/mj/relationships?campaignId=${encodeURIComponent(String(campaignId))}`, {
    token,
    method: "PATCH",
    body: { fromCharacterId, toCharacterId, stars },
  });

/* MAPS */
export function apiListMaps(token, campaignId, options = {}) {
  const qs = campaignId
    ? `?campaignId=${encodeURIComponent(String(campaignId))}`
    : "";
  return apiFetch(`/maps${qs}`, { token, ...options });
}

export const apiCreateMap = (token, campaignId, data, options = {}) =>
  apiFetch(`/maps`, {
    token,
    method: "POST",
    body: {
      campaignId: Number(campaignId),
      ...data,
    },
    ...options,
  });

export const apiDeleteMap = (token, mapId, options = {}) =>
  apiFetch(`/maps/${mapId}`, {
    token,
    method: "DELETE",
    ...options,
  });

export const apiSaveZoneCharacterPosition = (
  token,
  zoneId,
  characterId,
  xPercent,
  yPercent,
  options = {}
) =>
  apiFetch(
    `/zones/${encodeURIComponent(String(zoneId))}/characters/${encodeURIComponent(
      String(characterId)
    )}/position`,
    {
      token,
      method: "PATCH",
      body: { xPercent, yPercent },
      ...options,
    }
  );

export const apiGetZoneCharacterPositions = (token, zoneId, options = {}) =>
  apiFetch(`/zones/${encodeURIComponent(String(zoneId))}/characters/positions`, {
    token,
    ...options,
  });

export const apiUpdateZone = (token, zoneId, data, options = {}) =>
  apiFetch(`/zones/${encodeURIComponent(String(zoneId))}`, {
    token,
    method: "PATCH",
    body: data,
    ...options,
  });

/* USERS */
export const apiListUsers = (token, options = {}) =>
  apiFetch(`/users`, { token, ...options }).then(toArray);

export const apiGetUserProfile = (token, userId, options = {}) =>
  apiFetch(`/users/${encodeURIComponent(String(userId))}/profile`, {
    token,
    ...options,
  });

export function apiSearchUsers(token, q, options = {}) {
  const qs = `?q=${encodeURIComponent(String(q || ""))}`;
  return apiFetch(`/users/search${qs}`, { token, ...options }).then(toArray);
}

export const apiListFriends = (token, options = {}) =>
  apiFetch(`/friends`, { token, ...options }).then(toArray);

export const apiListFriendRequests = (token, options = {}) =>
  apiFetch(`/friends/requests`, { token, ...options }).then((data) => ({
    incoming: toArray(data?.incoming),
    outgoing: toArray(data?.outgoing),
  }));

export const apiSendFriendRequest = (token, userId, options = {}) =>
  apiFetch(`/friends/request`, {
    token,
    method: "POST",
    body: { userId },
    ...options,
  });

export const apiAcceptFriendRequest = (token, friendshipId, options = {}) =>
  apiFetch(`/friends/${encodeURIComponent(String(friendshipId))}/accept`, {
    token,
    method: "POST",
    ...options,
  });

export const apiDeclineFriendRequest = (token, friendshipId, options = {}) =>
  apiFetch(`/friends/${encodeURIComponent(String(friendshipId))}/decline`, {
    token,
    method: "POST",
    ...options,
  });

export const apiRemoveFriend = (token, otherUserId, options = {}) =>
  apiFetch(`/friends/${encodeURIComponent(String(otherUserId))}`, {
    token,
    method: "DELETE",
    ...options,
  }).then(okTrue);

export const apiGetFriendProfile = (token, otherUserId, options = {}) =>
  apiFetch(`/friends/${encodeURIComponent(String(otherUserId))}/profile`, {
    token,
    method: "GET",
    ...options,
  });

/* ADMIN / KNOWLEDGE (MJ only) */
export function apiGetKnowledgeState(token, characterId, field, options = {}) {
  const qs = `?characterId=${encodeURIComponent(String(characterId))}&field=${encodeURIComponent(
    String(field)
  )}`;
  return apiFetch(`/admin/knowledge/state${qs}`, {
    token,
    method: "GET",
    ...options,
  });
}

export function apiCanViewKnowledge(
  token,
  viewerId,
  characterId,
  field,
  options = {}
) {
  const qs =
    `?viewerId=${encodeURIComponent(String(viewerId))}` +
    `&characterId=${encodeURIComponent(String(characterId))}` +
    `&field=${encodeURIComponent(String(field))}`;

  return apiFetch(`/admin/knowledge/can-view${qs}`, {
    token,
    method: "GET",
    ...options,
  });
}

export const apiGrantKnowledge = (token, data, options = {}) =>
  apiFetch(`/admin/knowledge/grant`, {
    token,
    method: "POST",
    body: data,
    ...options,
  });

export const apiRevokeKnowledge = (token, data, options = {}) =>
  apiFetch(`/admin/knowledge/revoke`, {
    token,
    method: "POST",
    body: data,
    ...options,
  });