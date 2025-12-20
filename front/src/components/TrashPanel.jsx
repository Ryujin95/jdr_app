// src/components/TrashPanel.jsx
import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";
import "../CSS/TrashPanel.css";

function TrashPanel() {
  // 1) TOUS les hooks déclarés en haut, sans condition
  const { token } = useContext(AuthContext);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trash, setTrash] = useState({
    users: [],
    characters: [],
    locations: [],
  });
  const [error, setError] = useState(null);

  const fetchTrash = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/trash`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement de la corbeille");
      }

      const data = await response.json();
      setTrash({
        users: data.users || [],
        characters: data.characters || [],
        locations: data.locations || [],
      });
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen, fetchTrash]);

  // 2) Les retours conditionnels seulement APRÈS les hooks
  if (!token) {
    return null;
  }

  return (
    <div className="trash-footer-container">
      <button
        className="trash-footer-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Corbeille
        <span className="trash-footer-count">
          {trash.characters.length +
            trash.locations.length +
            trash.users.length}
        </span>
      </button>

      {isOpen && (
        <div className="trash-footer-panel">
          {loading && <p className="trash-info">Chargement...</p>}
          {error && <p className="trash-error">{error}</p>}

          {!loading && !error && (
            <div className="trash-footer-content">
              <div className="trash-footer-section">
                <h4>Persos</h4>
                {trash.characters.length === 0 && (
                  <p className="trash-empty">Aucun.</p>
                )}
                {trash.characters.map((c) => (
                  <div key={`character-${c.id}`} className="trash-footer-item">
                    <span className="trash-footer-label">
                      {c.nickname || "(sans pseudo)"}
                    </span>
                    <div className="trash-footer-actions">
                      <button
                        className="trash-btn trash-btn-restore"
                        onClick={() => handleRestore("character", c.id, token, fetchTrash, setError)}
                      >
                        Remettre
                      </button>
                      <button
                        className="trash-btn trash-btn-delete"
                        onClick={() => handleForceDelete("character", c.id, token, fetchTrash, setError)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="trash-footer-section">
                <h4>Lieux</h4>
                {trash.locations.length === 0 && (
                  <p className="trash-empty">Aucun.</p>
                )}
                {trash.locations.map((l) => (
                  <div key={`location-${l.id}`} className="trash-footer-item">
                    <span className="trash-footer-label">{l.name}</span>
                    <div className="trash-footer-actions">
                      <button
                        className="trash-btn trash-btn-restore"
                        onClick={() => handleRestore("location", l.id, token, fetchTrash, setError)}
                      >
                        Remettre
                      </button>
                      <button
                        className="trash-btn trash-btn-delete"
                        onClick={() => handleForceDelete("location", l.id, token, fetchTrash, setError)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="trash-footer-section">
                <h4>Joueurs</h4>
                {trash.users.length === 0 && (
                  <p className="trash-empty">Aucun.</p>
                )}
                {trash.users.map((u) => (
                  <div key={`user-${u.id}`} className="trash-footer-item">
                    <span className="trash-footer-label">
                      {u.username || u.email}
                    </span>
                    <div className="trash-footer-actions">
                      <button
                        className="trash-btn trash-btn-restore"
                        onClick={() => handleRestore("user", u.id, token, fetchTrash, setError)}
                      >
                        Remettre
                      </button>
                      <button
                        className="trash-btn trash-btn-delete"
                        onClick={() => handleForceDelete("user", u.id, token, fetchTrash, setError)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// fonctions utilitaires en dehors du composant (pas des hooks, donc pas de problème)
async function handleRestore(type, id, token, fetchTrash, setError) {
  try {
    setError(null);

    const res = await fetch(`${API_URL}/trash/restore/${type}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Impossible de restaurer cet élément");
    }

    await fetchTrash();
  } catch (err) {
    setError(err.message || "Erreur lors de la restauration");
  }
}

async function handleForceDelete(type, id, token, fetchTrash, setError) {
  if (!window.confirm("Supprimer définitivement cet élément ?")) {
    return;
  }

  try {
    setError(null);

    const res = await fetch(`${API_URL}/trash/force/${type}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Impossible de supprimer définitivement cet élément");
    }

    await fetchTrash();
  } catch (err) {
    setError(err.message || "Erreur lors de la suppression définitive");
  }
}

export default TrashPanel;
