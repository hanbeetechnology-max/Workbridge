// Thin fetch wrapper for the real backend (backend/src/server.js).
// Exported so socketClient.js connects to the exact same origin.
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");
export const API_URL = API_BASE_URL;

// The single source of truth for the signed-in user's JWT — written by
// AuthContext on login/register/logout, read here on every request. Kept as
// a plain localStorage key (not React state) so apiFetch can be called from
// plain lib functions (projectsApi.js etc.) without needing a hook.
const TOKEN_KEY = "workbridge_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Stashes the real admin's own token+user while POST /api/admin/impersonate
// swaps the active session to a target user (AuthContext.jsx's
// startImpersonation/endImpersonation) — a separate key from TOKEN_KEY so
// "End Session" can restore the admin's session directly without a fresh
// login. Its mere presence is also how the rest of the app knows an
// impersonation is currently active (see ImpersonationBanner.jsx).
const IMPERSONATOR_STASH_KEY = "workbridge_impersonator_stash";

export function getImpersonatorStash() {
  const raw = localStorage.getItem(IMPERSONATOR_STASH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setImpersonatorStash(stash) {
  if (stash) {
    localStorage.setItem(IMPERSONATOR_STASH_KEY, JSON.stringify(stash));
  } else {
    localStorage.removeItem(IMPERSONATOR_STASH_KEY);
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * apiFetch("/api/projects?role=business")
 * apiFetch(`/api/projects/${id}/complete`, { method: "POST" })
 *
 * Attaches the stored JWT if one exists; unauthenticated calls (register,
 * login, public profile reads) simply omit the header rather than failing —
 * the backend decides what's guarded, this client doesn't duplicate that.
 */
export async function apiFetch(path, { method = "GET", body, headers: extraHeaders } = {}) {
  const token = getToken();

  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network failure (backend down, CORS, offline) — distinct from a
    // well-formed error response, since there's no res.status to report.
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error?.message ?? `Request failed (${res.status}).`);
  }

  return payload?.data;
}
