import { useState, useCallback } from "react";
import {
  fetchCharacters,
  moveCharacterToTrash,
} from "../../../api/charactersApi";

export function useCharacters(token, campaignId) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!token || !campaignId) return;

    try {
      setLoading(true);
      setLoadError(null);

      const data = await fetchCharacters(token, campaignId);
      setCharacters(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [token, campaignId]);

  const sendToTrash = useCallback(
    async (id) => {
      await moveCharacterToTrash(token, id, campaignId);
      setCharacters((prev) => prev.filter((c) => c.id !== id));
    },
    [token, campaignId]
  );

  return {
    characters,
    loading,
    loadError,
    load,
    sendToTrash,
  };
}