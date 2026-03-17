// src/components/RightSidebar.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";
import "../CSS/RightSidebar.css";
import {
  apiSearchUsers,
  apiListFriends,
  apiListFriendRequests,
  apiSendFriendRequest,
  apiAcceptFriendRequest,
  apiDeclineFriendRequest,
  apiRemoveFriend,
} from "../api/api";

export default function RightSidebar({ open, setOpen }) {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useContext(AuthContext);
  const { addNotification } = useContext(NotificationContext);

  const [showOffline, setShowOffline] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });

  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState([]);
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const [ctxMenu, setCtxMenu] = useState(null);

  useEffect(() => {
    if (!open || !token) return;

    let cancelled = false;

    const shouldShowLoading =
      friends.length === 0 &&
      (requests?.incoming?.length || 0) === 0 &&
      (requests?.outgoing?.length || 0) === 0;

    if (shouldShowLoading) setLoadingFriends(true);

    (async () => {
      try {
        const [f, r] = await Promise.all([apiListFriends(token), apiListFriendRequests(token)]);
        if (cancelled) return;

        setFriends(Array.isArray(f) ? f : []);
        setRequests({
          incoming: Array.isArray(r?.incoming) ? r.incoming : [],
          outgoing: Array.isArray(r?.outgoing) ? r.outgoing : [],
        });
      } catch (e) {
        if (cancelled) return;

        setFriends([]);
        setRequests({ incoming: [], outgoing: [] });

        const msg = e?.message || "Impossible de charger la liste d'amis.";
        addNotification?.({ type: "error", message: msg });
      } finally {
        if (!cancelled && shouldShowLoading) setLoadingFriends(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, token, addNotification]);

  const onlineUsers = useMemo(() => {
    return (Array.isArray(friends) ? friends : []).filter((f) => !!f.isOnline);
  }, [friends]);

  const offlineUsers = useMemo(() => {
    return (Array.isArray(friends) ? friends : []).filter((f) => !f.isOnline);
  }, [friends]);

  const incoming = useMemo(() => {
    return Array.isArray(requests?.incoming) ? requests.incoming : [];
  }, [requests]);

  const outgoing = useMemo(() => {
    return Array.isArray(requests?.outgoing) ? requests.outgoing : [];
  }, [requests]);

  async function refreshLists() {
    if (!token) return;

    const [f, r] = await Promise.all([
      apiListFriends(token).catch(() => []),
      apiListFriendRequests(token).catch(() => ({ incoming: [], outgoing: [] })),
    ]);

    setFriends(Array.isArray(f) ? f : []);
    setRequests({
      incoming: Array.isArray(r?.incoming) ? r.incoming : [],
      outgoing: Array.isArray(r?.outgoing) ? r.outgoing : [],
    });
  }

  async function runSearch(value) {
    const text = String(value || "");
    setQ(text);
    setSearchError("");

    const trimmed = text.trim();
    if (!token) return;

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const list = await apiSearchUsers(token, trimmed);

      const meId = String(user?.id ?? "");
      const friendIds = new Set((friends || []).map((f) => String(f.userId)));
      const outgoingIds = new Set((outgoing || []).map((r) => String(r.userId)));
      const incomingIds = new Set((incoming || []).map((r) => String(r.userId)));

      const cleaned = (Array.isArray(list) ? list : [])
        .filter((u) => String(u.id) !== meId)
        .map((u) => ({
          ...u,
          isFriend: friendIds.has(String(u.id)),
          requested: outgoingIds.has(String(u.id)),
          incoming: incomingIds.has(String(u.id)),
        }));

      setResults(cleaned);
    } catch (e) {
      const msg = e?.message || "Recherche impossible.";
      setSearchError(msg);
      setResults([]);
      addNotification?.({ type: "error", message: msg });
    } finally {
      setSearchLoading(false);
    }
  }

  async function onAdd(userId) {
    if (!token) return;

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });

    try {
      await apiSendFriendRequest(token, userId);
      await refreshLists();

      setResults((prev) => prev.map((u) => (u.id === userId ? { ...u, requested: true } : u)));
      addNotification?.({ type: "success", message: "Demande d’ami envoyée." });
    } catch (e) {
      const msg = e?.message || "Impossible d’envoyer la demande.";
      setSearchError(msg);
      addNotification?.({ type: "error", message: msg });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  async function onAccept(friendshipId) {
    if (!token) return;
    try {
      await apiAcceptFriendRequest(token, friendshipId);
      await refreshLists();
      addNotification?.({ type: "success", message: "Ami ajouté." });
    } catch (e) {
      const msg = e?.message || "Impossible d’accepter la demande.";
      addNotification?.({ type: "error", message: msg });
    }
  }

  async function onDecline(friendshipId) {
    if (!token) return;
    try {
      await apiDeclineFriendRequest(token, friendshipId);
      await refreshLists();
      addNotification?.({ type: "success", message: "Demande refusée." });
    } catch (e) {
      const msg = e?.message || "Impossible de refuser la demande.";
      addNotification?.({ type: "error", message: msg });
    }
  }

  async function onCancel(otherUserId) {
    if (!token) return;
    try {
      await apiRemoveFriend(token, otherUserId);
      await refreshLists();
      addNotification?.({ type: "success", message: "Demande annulée." });
    } catch (e) {
      const msg = e?.message || "Impossible d’annuler.";
      addNotification?.({ type: "error", message: msg });
    }
  }

  function openFriendMenu(e, friend) {
    e.preventDefault();
    e.stopPropagation();

    if (!friend?.userId) return;

    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      friend: { userId: friend.userId, username: friend.username },
    });
  }

  function closeFriendMenu() {
    setCtxMenu(null);
  }

  useEffect(() => {
    if (!ctxMenu) return;

    const onClick = () => closeFriendMenu();
    const onScroll = () => closeFriendMenu();
    const onKeyDown = (ev) => {
      if (ev.key === "Escape") closeFriendMenu();
    };

    window.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ctxMenu]);

  return (
    <div
      className={`right-dropdown ${open ? "is-open" : "is-closed"}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        setOpen(false);
        closeFriendMenu();
      }}
      aria-hidden={!open}
    >
      <div className="rs-block">
        <div className="rs-title-row">
          <h3 className="rs-title">Connecté</h3>

          <button
            type="button"
            className="rs-add-btn"
            onClick={() => {
              setAddOpen((v) => !v);
              setSearchError("");
              setResults([]);
              setQ("");
            }}
            aria-label="Ajouter un ami"
            title="Ajouter un ami"
          >
            +
          </button>
        </div>

        {onlineUsers.length === 0 && <p className="rs-empty">Aucun utilisateur connecté</p>}

        {onlineUsers.map((u) => (
          <div
            key={String(u.userId)}
            className="rs-user rs-user--online"
            onContextMenu={(e) => openFriendMenu(e, u)}
            title="Clic droit"
          >
            {u.username}
          </div>
        ))}

        {addOpen && (
          <div className="rs-add-panel">
            <input
              className="rs-add-input"
              value={q}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Rechercher un joueur…"
              autoFocus
            />

            {searchError && <div className="rs-error">{searchError}</div>}
            {searchLoading && <div className="rs-hint">Recherche…</div>}

            {!searchLoading && q.trim().length >= 2 && results.length === 0 && !searchError && (
              <div className="rs-hint">Aucun résultat</div>
            )}

            {results.length > 0 && (
              <div className="rs-results">
                {results.map((u) => {
                  const disabled = pendingIds.has(u.id) || u.isFriend || u.requested || u.incoming;

                  let label = "Ajouter";
                  if (u.isFriend) label = "Déjà ami";
                  else if (u.requested) label = "Envoyé";
                  else if (u.incoming) label = "Demande reçue";
                  else if (pendingIds.has(u.id)) label = "...";

                  return (
                    <div key={u.id} className="rs-result-row">
                      <div className="rs-result-name">{u.username}</div>
                      <button
                        type="button"
                        className="rs-result-action"
                        onClick={() => onAdd(u.id)}
                        disabled={disabled}
                      >
                        {label}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(incoming.length > 0 || outgoing.length > 0) && <div className="rs-sep" />}

        {incoming.length > 0 && (
          <div className="rs-req-block">
            <div className="rs-subtitle">Demandes reçues</div>
            {incoming.map((r) => (
              <div key={String(r.friendshipId)} className="rs-req-row">
                <div className="rs-req-name">{r.username}</div>
                <div className="rs-req-actions">
                  <button type="button" className="rs-req-btn ok" onClick={() => onAccept(r.friendshipId)}>
                    Accepter
                  </button>
                  <button type="button" className="rs-req-btn no" onClick={() => onDecline(r.friendshipId)}>
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="rs-req-block" style={{ marginTop: incoming.length > 0 ? 10 : 0 }}>
            <div className="rs-subtitle">En attente</div>
            {outgoing.map((r) => (
              <div key={String(r.friendshipId)} className="rs-req-row">
                <div className="rs-req-name">{r.username}</div>
                <div className="rs-req-actions">
                  <button type="button" className="rs-req-btn ghost" onClick={() => onCancel(r.userId)}>
                    Annuler
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            {loadingFriends ? (
              <p className="rs-empty">Chargement...</p>
            ) : offlineUsers.length === 0 ? (
              <p className="rs-empty">Aucun ami hors ligne</p>
            ) : (
              offlineUsers.map((f) => (
                <div
                  key={String(f.userId)}
                  className="rs-user rs-user--offline"
                  onContextMenu={(e) => openFriendMenu(e, f)}
                  title="Clic droit"
                >
                  {f.username}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {ctxMenu && (
        <div
          className="rs-context-menu"
          style={{
            position: "fixed",
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 99999,
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            className="rs-context-item"
            onClick={() => {
              navigate(`/friends/${ctxMenu.friend.userId}`);
              closeFriendMenu();
            }}
          >
            Profil
          </button>

          <button
            type="button"
            className="rs-context-item rs-context-item--danger"
            onClick={async () => {
              const ok = window.confirm("Retirer cet ami ?");
              if (!ok) return;

              try {
                await apiRemoveFriend(token, ctxMenu.friend.userId);
                closeFriendMenu();
                await refreshLists();
                addNotification?.({ type: "success", message: "Ami retiré." });
              } catch (e) {
                closeFriendMenu();
                const msg = e?.message || "Impossible de retirer cet ami.";
                addNotification?.({ type: "error", message: msg });
              }
            }}
          >
            Retirer des amis
          </button>
        </div>
      )}
    </div>
  );
}