import { useState, useCallback, useRef } from "react";
import { saveRelationshipStars } from "../../../api/requestContracts";
import {
  fetchKnown,          // MJ
  fetchKnownViewer,    // JOUEUR
  fetchCandidates,
  addKnown,
  removeKnown,
  updateRelationship,
} from "../../../api/charactersApi";

export function useCharacterRelations(token, campaignId, isAdminOrOwner) {
  const [knownMap, setKnownMap] = useState({});
  const [candidateMap, setCandidateMap] = useState({});
  const [openPanelId, setOpenPanelId] = useState(null);
  const pendingStars = useRef(new Set());

  const loadKnown = useCallback(
    async (fromId) => {
      const data = isAdminOrOwner
        ? await fetchKnown(token, fromId, campaignId)
        : await fetchKnownViewer(token, fromId, campaignId);

      setKnownMap((prev) => ({ ...prev, [fromId]: data }));
    },
    [token, campaignId, isAdminOrOwner]
  );

  const loadCandidates = useCallback(
    async (fromId) => {
      if (!isAdminOrOwner) return; // joueur: pas de candidates / pas d’edit relation
      const data = await fetchCandidates(token, fromId, campaignId);
      setCandidateMap((prev) => ({ ...prev, [fromId]: data }));
    },
    [token, campaignId, isAdminOrOwner]
  );

  const handleAddKnown = useCallback(
    async (fromId, toId, type) => {
      if (!isAdminOrOwner) return;
      await addKnown(token, fromId, toId, type, campaignId);
      await loadKnown(fromId);
      await loadCandidates(fromId);
    },
    [token, campaignId, loadKnown, loadCandidates, isAdminOrOwner]
  );

  const handleRemoveKnown = useCallback(
    async (fromId, toId) => {
      if (!isAdminOrOwner) return;
      await removeKnown(token, fromId, toId, campaignId);
      setKnownMap((prev) => ({
        ...prev,
        [fromId]: (prev[fromId] || []).filter((k) => k.id !== toId),
      }));
      await loadCandidates(fromId);
    },
    [token, campaignId, loadCandidates, isAdminOrOwner]
  );

  const handleUpdateStars = useCallback(
    async (fromId, toId, stars) => {
      if (!isAdminOrOwner) return;
      const key = `${fromId}:${toId}`;
      if (pendingStars.current.has(key)) return;
      pendingStars.current.add(key);
      try {
        await saveRelationshipStars({
          send: () => updateRelationship(token, fromId, toId, stars, campaignId),
          setKnownMap,
          fromId,
          toId,
        });
      } finally {
        pendingStars.current.delete(key);
      }
    },
    [token, campaignId, isAdminOrOwner]
  );

  return {
    knownMap,
    candidateMap,
    openPanelId,
    setOpenPanelId,
    loadKnown,
    loadCandidates,
    handleAddKnown,
    handleRemoveKnown,
    handleUpdateStars,
  };
}
