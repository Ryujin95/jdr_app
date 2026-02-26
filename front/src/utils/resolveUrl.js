// src/utils/resolveUrl.js
export function makeResolveUrl(API_URL) {
  const BACK_BASE_URL = API_URL.replace(/\/api\/?$/, "");

  return function resolveUrl(path) {
    if (!path) return null;
    const url = String(path).trim();
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${BACK_BASE_URL}${url}`;
    return `${BACK_BASE_URL}/${url}`;
  };
}