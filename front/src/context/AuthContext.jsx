import { useCallback, useMemo, useState } from "react";
import { apiListFriends, apiListFriendRequests } from "../features/friends/api/friendApi.js";
import { fetchCurrentUser, loginWithCredentials } from "../features/auth/api/authApi.js";
import {
  clearStoredAuth,
  readStoredAuth,
  storeAuth,
} from "../features/auth/sessionStorage.js";
import { useAuthSynchronization } from "../features/auth/hooks/useAuthSynchronization.js";
import { AuthContext } from "./AuthContextObject.js";

export function AuthProvider({ children }) {
  const [storedAuth] = useState(readStoredAuth);
  const [token, setToken] = useState(storedAuth.token);
  const [user, setUser] = useState(storedAuth.user);
  const [meSyncedOnce, setMeSyncedOnce] = useState(false);

  const prefetchFriends = useCallback(async (jwt) => {
    try {
      await Promise.all([apiListFriends(jwt), apiListFriendRequests(jwt)]);
    } catch (error) {
      console.error("prefetchFriends error:", error);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setMeSyncedOnce(false);
    clearStoredAuth();
  }, []);

  const saveAuth = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setMeSyncedOnce(true);
    storeAuth(nextToken, nextUser);
    prefetchFriends(nextToken);
  }, [prefetchFriends]);

  const login = useCallback(async (email, password) => {
    const nextToken = await loginWithCredentials(email, password);

    const previousAuth = readStoredAuth();
    storeAuth(nextToken, null);

    try {
      const me = await fetchCurrentUser(nextToken);
      saveAuth(nextToken, me);
    } catch (error) {
      if (previousAuth.token) {
        storeAuth(previousAuth.token, previousAuth.user);
      } else {
        clearStoredAuth();
      }
      throw error;
    }
  }, [saveAuth]);

  const updateUser = useCallback((partial) => {
    setUser((previous) => {
      const next = { ...(previous || {}), ...partial };
      storeAuth(token, next);
      return next;
    });
  }, [token]);

  useAuthSynchronization({
    token,
    meSyncedOnce,
    fetchMe: fetchCurrentUser,
    setUser,
    setMeSyncedOnce,
    prefetchFriends,
    logout,
  });

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  }), [token, user, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
