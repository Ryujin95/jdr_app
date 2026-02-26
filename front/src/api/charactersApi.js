import { API_URL } from "../config";

export async function fetchCharacters(token, campaignId) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

  const res = await fetch(`${API_URL}/characters${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => []);
}

export async function moveCharacterToTrash(token, id, campaignId) {
  const res = await fetch(`${API_URL}/trash/move/character/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ campaignId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => null);
}

export async function fetchKnown(token, fromId, campaignId) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

  const res = await fetch(`${API_URL}/mj/characters/${fromId}/known${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => []);
}

export async function fetchCandidates(token, fromId, campaignId) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

  const res = await fetch(`${API_URL}/mj/characters/${fromId}/candidates${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => []);
}

export async function addKnown(token, fromId, toId, type, campaignId) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

  const res = await fetch(`${API_URL}/mj/characters/${fromId}/known${qs}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ toCharacterId: toId, type }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => null);
}

export async function removeKnown(token, fromId, toId, campaignId) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

  const res = await fetch(`${API_URL}/mj/characters/${fromId}/known/${toId}${qs}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => null);
}

export async function updateRelationship(token, fromId, toId, stars, campaignId) {
  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";

  const res = await fetch(`${API_URL}/mj/relationships${qs}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fromCharacterId: fromId,
      toCharacterId: toId,
      relationshipStars: stars,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur HTTP ${res.status}`);
  }

  return res.json().catch(() => null);
}

export async function createCharacter(token, formData) {
  const res = await fetch(`${API_URL}/characters`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erreur création (HTTP ${res.status})`);
  }

  return res.json().catch(() => null);
}