// AuthPage.jsx calls apiFetch("/api/auth/...") inline for
// login/register/forgot-password since nothing else has needed those calls
// reused elsewhere. SettingsPage.jsx does need these two, so they get a
// small dedicated wrapper here, matching profilesApi.js/projectsApi.js.
import { apiFetch } from "./apiClient";

export function changePassword({ currentPassword, newPassword }) {
  return apiFetch("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

// Re-proves identity for a sensitive CHANGE (e.g. updating a saved payout
// destination) beyond just having a session — returns a short-lived
// { reverifyToken } to attach as X-Reverify-Token on the actual change call.
export function verifyPassword(password) {
  return apiFetch("/api/auth/verify-password", {
    method: "POST",
    body: { password },
  });
}

export function updateNotificationPrefs(prefsPatch) {
  return apiFetch("/api/auth/notification-prefs", {
    method: "PATCH",
    body: prefsPatch,
  });
}

export function deactivateAccount(confirmation) {
  return apiFetch("/api/auth/deactivate-self", {
    method: "PATCH",
    body: { confirmation },
  });
}
