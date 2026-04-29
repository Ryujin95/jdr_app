// src/api/charactersApi.js
import {
  apiListCharacters,
  apiGetAssignablePlayers,
  apiGetKnownCharacters,
  apiGetRelationCandidates,
  apiAddKnownCharacter,
  apiRemoveKnownCharacter,
  apiUpdateRelationshipStars,
} from "./api";
import { API_URL } from "../config";

export const fetchCharacters = (token, campaignId) =>
  apiListCharacters(token, campaignId);

export const fetchKnown = (token, fromId, campaignId) =>
  apiGetKnownCharacters(token, fromId, campaignId);

export const fetchCandidates = (token, fromId, campaignId) =>
  apiGetRelationCandidates(token, fromId, campaignId);

export const addKnown = (token, fromId, toId, type, campaignId) =>
  apiAddKnownCharacter(token, fromId, campaignId, { toCharacterId: toId, type });

export const removeKnown = (token, fromId, toId, campaignId) =>
  apiRemoveKnownCharacter(token, fromId, toId, campaignId);

export const updateRelationship = (token, fromId, toId, stars, campaignId) =>
  apiUpdateRelationshipStars(token, campaignId, fromId, toId, stars);

export const getAssignablePlayersForCharacterSelect = (token, campaignId) =>
  apiGetAssignablePlayers(token, campaignId);

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

export async function fetchKnownViewer(token, fromId, campaignId) {
  const res = await fetch(
    `${API_URL}/characters/${fromId}/known?campaignId=${encodeURIComponent(campaignId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }

  return res.json().catch(() => []);
}