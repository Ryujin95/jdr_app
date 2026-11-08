export class ApiError extends Error {
  constructor(message, { status, code, errorId } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errorId = errorId;
  }
}
export async function apiErrorFromResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);
  const message = response.status >= 500
    ? "Erreur serveur."
    : typeof payload?.message === "string"
      ? payload.message
      : fallbackMessage;

  return new ApiError(message, {
    status: response.status,
    code: payload?.code,
    errorId: payload?.errorId,
  });
}

/** Build the exact Fetch request, keeping the browser responsible for multipart boundaries. */
export function createApiFetchRequest(apiUrl, path, {
  token,
  method = "GET",
  body,
  signal,
  headers: extraHeaders,
} = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
    ...(isFormData || body === undefined
      ? {}
      : { "Content-Type": "application/json" }),
  };

  return {
    url: `${apiUrl}${path}`,
    init: {
      method,
      signal,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    },
  };
}
