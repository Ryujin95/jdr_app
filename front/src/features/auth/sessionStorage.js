const AUTH_STORAGE_KEY = "auth";

export function readStoredAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { token: null, user: null };

  try {
    const parsed = JSON.parse(raw);
    return parsed?.token
      ? { token: parsed.token, user: parsed.user || null }
      : { token: null, user: null };
  } catch (error) {
    console.error("Auth parse error:", error);
    return { token: null, user: null };
  }
}

export function storeAuth(token, user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
