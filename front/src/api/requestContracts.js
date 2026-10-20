/** Keep the multipart body intact and add the campaign context expected by the API. */
export function prepareMapCreateFormData(campaignId, data) {
  if (typeof FormData === "undefined" || !(data instanceof FormData)) {
    throw new TypeError("Map creation requires FormData");
  }

  data.set("campaignId", String(Number(campaignId)));
  return data;
}

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
    ? 'Erreur serveur.'
    : typeof payload?.message === 'string'
      ? payload.message
      : fallbackMessage;

  return new ApiError(message, {
    status: response.status,
    code: payload?.code,
    errorId: payload?.errorId,
  });
}

export function buildRelationshipStarsPayload(fromCharacterId, toCharacterId, stars) {
  return {
    fromCharacterId,
    toCharacterId,
    relationshipStars: stars,
  };
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

/** Only publish a relationship value after its persisted response is received. */
export async function saveRelationshipStars({ send, setKnownMap, fromId, toId }) {
  const response = await send();
  const savedStars = Number(response?.relationshipStars);
  if (!Number.isInteger(savedStars) || savedStars < 0 || savedStars > 5) {
    throw new Error("Invalid relationship stars response");
  }

  setKnownMap((previous) => ({
    ...previous,
    [fromId]: (previous[fromId] || []).map((known) =>
      known.id === toId ? { ...known, relationshipStars: savedStars } : known
    ),
  }));
  return response;
}
