import { API_URL } from "../../config.js";
import {
  apiErrorFromResponse,
  createApiFetchRequest,
} from "./requestContracts.js";

/** Send a request and preserve the response parsing used by the existing API helpers. */
export async function requestApi(path, {
  token,
  method = "GET",
  body,
  signal,
  headers: extraHeaders,
  errorFallback,
  parseResponse,
} = {}) {
  const { url, init } = createApiFetchRequest(API_URL, path, {
    token,
    method,
    body,
    signal,
    headers: extraHeaders,
  });
  const response = await fetch(url, init);

  if (!response.ok) {
    const fallbackMessage = typeof errorFallback === "function"
      ? errorFallback(response.status)
      : errorFallback || `HTTP ${response.status}`;
    throw await apiErrorFromResponse(response, fallbackMessage);
  }

  if (parseResponse) return parseResponse(response);
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return response.text().catch(() => null);
  }

  return response.json();
}
