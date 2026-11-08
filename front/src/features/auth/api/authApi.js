import { API_URL } from "../../../config.js";

export async function fetchCurrentUser(token) {
  const response = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) throw new Error("SESSION_EXPIRED");
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Impossible de charger /me");
  }

  return response.json();
}

export async function loginWithCredentials(email, password) {
  const response = await fetch(`${API_URL}/login_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.token) {
    throw new Error(data?.message || "Invalid credentials");
  }

  return data.token;
}
