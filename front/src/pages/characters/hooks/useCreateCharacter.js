import { useState, useCallback } from "react";
import { createCharacter } from "../../../api/charactersApi";

export function useCreateCharacter(token, campaignId, onSuccess) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(
    async (formData) => {
      try {
        setSubmitting(true);
        setError(null);

        await createCharacter(token, formData);

        if (typeof onSuccess === "function") {
          onSuccess();
        }
      } catch (e) {
        setError(e.message || "Erreur lors de la création.");
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [token, campaignId, onSuccess]
  );

  return {
    submitting,
    error,
    submit,
  };
}