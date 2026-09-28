export const API_URL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

let inFlight = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token.
 * Single-flight: concurrent callers share one request, which matters because
 * the server rotates the refresh token and treats a second use as token theft.
 */
export function requestRefresh() {
  if (!inFlight) {
    inFlight = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function requestLogout() {
  return fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  }).catch(() => null);
}
