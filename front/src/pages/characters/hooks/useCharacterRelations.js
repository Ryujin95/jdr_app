import { useState, useCallback } from "react";
import {
  fetchKnown,
  fetchCandidates,
  addKnown,
  removeKnown,
  updateRelationship,
} from "../../../api/charactersApi";

export function useCharacterRelations(token, campaignId) {
  const [knownMap, setKnownMap] = useState({});
  const [candidateMap, setCandidateMap] = useState({});
  const [openPanelId, setOpenPanelId] = useState(null);

  const loadKnown = useCallback(
    async (fromId) => {
      const data = await fetchKnown(token, fromId, campaignId);
      setKnownMap((prev) => ({ ...prev, [fromId]: data }));
    },
    [token, campaignId]
  );

  const loadCandidates = useCallback(
    async (fromId) => {
      const data = await fetchCandidates(token, fromId, campaignId);
      setCandidateMap((prev) => ({ ...prev, [fromId]: data }));
    },
    [token, campaignId]
  );

  const handleAddKnown = useCallback(
    async (fromId, toId, type) => {
      await addKnown(token, fromId, toId, type, campaignId);
      await loadKnown(fromId);
      await loadCandidates(fromId);
    },
    [token, campaignId, loadKnown, loadCandidates]
  );

  const handleRemoveKnown = useCallback(
    async (fromId, toId) => {
      await removeKnown(token, fromId, toId, campaignId);
      setKnownMap((prev) => ({
        ...prev,
        [fromId]: (prev[fromId] || []).filter((k) => k.id !== toId),
      }));
      await loadCandidates(fromId);
    },
    [token, campaignId, loadCandidates]
  );

  const handleUpdateStars = useCallback(
    async (fromId, toId, stars) => {
      setKnownMap((prev) => ({
        ...prev,
        [fromId]: (prev[fromId] || []).map((k) =>
          k.id === toId ? { ...k, relationshipStars: stars } : k
        ),
      }));

      await updateRelationship(token, fromId, toId, stars, campaignId);
    },
    [token, campaignId]
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