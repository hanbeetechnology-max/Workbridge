// The API Bridge for the admin console's real tabs (Master Dashboard,
// Verification Center, Dispute Resolution) — every call here hits the real
// backend, guarded to role: admin server-side.
import { apiFetch } from "./apiClient";

export function getStats() {
  return apiFetch("/api/admin/stats");
}

export function listVerifications() {
  return apiFetch("/api/admin/verify");
}

export function listAllUsers() {
  return apiFetch("/api/admin/users");
}

// Real, audited "log in as this user" — writes a platform_logs row
// server-side before issuing a short-lived (30min) elevated token. See
// AuthContext.jsx's startImpersonation for how the session actually swaps.
export function impersonateUser(targetUserId) {
  return apiFetch("/api/admin/impersonate", { method: "POST", body: { targetUserId } });
}

export function reviewVerification(id, approved) {
  return apiFetch(`/api/admin/verify/${id}`, { method: "PATCH", body: { approved } });
}

export function listDisputes() {
  return apiFetch("/api/admin/disputes");
}

export function resolveDispute(id, resolution, note) {
  return apiFetch(`/api/admin/disputes/${id}/resolve`, { method: "POST", body: { resolution, note } });
}

export function listTransactions() {
  return apiFetch("/api/admin/transactions");
}

// Fund Releases — projects a business has requested release for
// (PENDING_RELEASE), waiting on staff to actually complete the payout.
export function listPendingReleases() {
  return apiFetch("/api/admin/pending-releases");
}

// Withdrawals — workers' real cash-out requests, waiting on staff to
// actually send the UPI/bank transfer.
export function listPendingWithdrawals() {
  return apiFetch("/api/admin/withdrawals");
}

export function resolveWithdrawal(id, { approved, note }) {
  return apiFetch(`/api/admin/withdrawals/${id}/resolve`, { method: "POST", body: { approved, note } });
}

// Escrow Funding — businesses' real transfer-proof submissions (UTR +
// screenshot), waiting on staff to verify the transfer actually happened
// before the project is granted FUNDS_SECURED.
export function listPendingEscrowFunding() {
  return apiFetch("/api/admin/escrow-funding");
}

export function resolveEscrowFunding(id, { approved, note }) {
  return apiFetch(`/api/admin/escrow-funding/${id}/resolve`, { method: "POST", body: { approved, note } });
}

// Real queue behind the worker "Skill Bridge Profile Audit" perk.
export function listPendingAudits() {
  return apiFetch("/api/admin/audits");
}

export function resolveAudit(id, { note }) {
  return apiFetch(`/api/admin/audits/${id}/resolve`, { method: "PATCH", body: { note } });
}

// Security Monitor — blocked_message_attempts is the only record of a
// contact-info send that got hard-blocked (see backend's
// messages.controller.js); the message itself is never stored elsewhere.
export function listBlockedAttempts() {
  return apiFetch("/api/admin/blocked-attempts");
}

// action: "redact_and_send" (editedBody required) | "ban" | "warn" | "dismiss"
export function resolveBlockedAttempt(id, action, { editedBody, note } = {}) {
  return apiFetch(`/api/admin/blocked-attempts/${id}`, {
    method: "PATCH",
    body: { action, editedBody, note },
  });
}

// Message Monitor — full-text search over every real chat message, the
// manual complement to blocked-attempts (which only shows what the
// contact-info filter auto-caught).
export function searchMessages(search) {
  const params = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetch(`/api/admin/messages${params}`);
}

// Moderates the sender of a specific message found via Message Monitor —
// the manual counterpart to resolveBlockedAttempt's actions, for anything
// that slipped past the automated contact-info filter.
// action: "ban" | "unban" | "warn" | "deduct_points" (points required for deduct_points)
export function moderateMessageSender(messageId, action, { points } = {}) {
  return apiFetch(`/api/admin/messages/${messageId}/moderate`, {
    method: "PATCH",
    body: { action, points },
  });
}

// Message Monitor's "Cascading Workspace" — left/middle column data.
export function listMonitoredBusinesses() {
  return apiFetch("/api/admin/messages/businesses");
}

export function listWorkersForBusiness(businessId) {
  return apiFetch(`/api/admin/messages/businesses/${businessId}/workers`);
}

// Top-bar moderation actions in the Cascading Workspace, targeting a user
// directly rather than a specific message.
// action: "ban" | "unban" | "warn" | "deduct_points"
export function moderateUser(userId, action, { points, projectId, note } = {}) {
  return apiFetch(`/api/admin/users/${userId}/moderate`, {
    method: "PATCH",
    body: { action, points, projectId, note },
  });
}

// Minimal real Support-tier RBAC — only a full admin (both flags still
// true) can call this successfully; the backend 403s otherwise.
export function updateAdminPermissions(userId, { canBanUsers, canReleaseFunds } = {}) {
  return apiFetch(`/api/admin/users/${userId}/permissions`, {
    method: "PATCH",
    body: { canBanUsers, canReleaseFunds },
  });
}
