// src/components/RightSidebar.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";
import "../CSS/RightSidebar.css";

function RightSidebar({ open, setOpen }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [allUsers, setAllUsers] = useState([]);
  const [showOffline, setShowOffline] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`${API_URL}/users`);
        const data = await res.json();
        setAllUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur chargement users", err);
      }
    }
    fetchUsers();
  }, []);

  const onlineUsers = useMemo(() => {
    if (!isAuthenticated || !user) return [];
    return [{ id: user.id, username: user.username }];
  }, [isAuthenticated, user]);

  const offlineUsers = useMemo(() => {
    const onlineIds = new Set(onlineUsers.map((u) => u.id));
    return allUsers.filter((u) => !onlineIds.has(u.id));
  }, [allUsers, onlineUsers]);

  if (!open) return null;

  return (
    <div
      className="right-dropdown"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="rs-block">
        <h3 className="rs-title">Connecté</h3>

        {onlineUsers.length === 0 && (
          <p className="rs-empty">Aucun utilisateur connecté</p>
        )}

        {onlineUsers.map((u) => (
          <div key={u.id} className="rs-user rs-user--online">
            {u.username}
          </div>
        ))}
      </div>

      <div className="rs-block">
        <button
          type="button"
          className="rs-offline-toggle"
          onClick={() => setShowOffline((v) => !v)}
        >
          <span className="rs-title">Hors ligne</span>
          <span className={`rs-arrow ${showOffline ? "open" : ""}`}>▼</span>
        </button>

        {showOffline && (
          <div className="rs-list">
            {offlineUsers.length === 0 ? (
              <p className="rs-empty">Personne hors ligne</p>
            ) : (
              offlineUsers.map((u) => (
                <div key={u.id} className="rs-user rs-user--offline">
                  {u.username}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RightSidebar;
