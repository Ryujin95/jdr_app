import { useEffect } from "react";

export function useAuthSynchronization({
  token,
  meSyncedOnce,
  fetchMe,
  setUser,
  setMeSyncedOnce,
  prefetchFriends,
  logout,
}) {
  useEffect(() => {
    if (!token || meSyncedOnce) return;
    let cancelled = false;

    const syncMe = async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;
        setUser(me);
        localStorage.setItem("auth", JSON.stringify({ token, user: me }));
        setMeSyncedOnce(true);
        await prefetchFriends(token);
      } catch (error) {
        if (!cancelled && error?.message === "SESSION_EXPIRED") logout();
      }
    };

    syncMe();
    return () => {
      cancelled = true;
    };
  }, [token, meSyncedOnce, fetchMe, prefetchFriends, logout, setUser, setMeSyncedOnce]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const pingPresence = async () => {
      try {
        const me = await fetchMe(token);
        if (cancelled) return;
        setUser((previous) => {
          const next = previous ? { ...previous, ...me } : me;
          localStorage.setItem("auth", JSON.stringify({ token, user: next }));
          return next;
        });
      } catch (error) {
        if (!cancelled && error?.message === "SESSION_EXPIRED") logout();
      }
    };

    const interval = setInterval(pingPresence, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, fetchMe, logout, setUser]);
}
