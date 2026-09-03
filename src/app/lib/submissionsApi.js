// The API Bridge for the Trust Checker — every submission (a worker's
// finished-work link/image, or a business's reference material) is real,
// goes through admin moderation, and is invisible to the counterparty until
// approved (enforced server-side, not just hidden in the UI).
import { apiFetch } from "./apiClient";

export function listSubmissions(projectId) {
  return apiFetch(`/api/projects/${projectId}/submissions`);
}

export function submitLink({ projectId, url, caption }) {
  return apiFetch(`/api/projects/${projectId}/submissions`, {
    method: "POST",
    body: { type: "link", url, caption },
  });
}

export function submitImage({ projectId, imageData, caption }) {
  return apiFetch(`/api/projects/${projectId}/submissions`, {
    method: "POST",
    body: { type: "image", imageData, caption },
  });
}

// ─── Admin moderation ─────────────────────────────────────────────────────

export function listPendingSubmissions() {
  return apiFetch("/api/admin/submissions");
}

export function listReviewedSubmissions() {
  return apiFetch("/api/admin/submissions/history");
}

// Still PENDING_REVIEW, but the project it belonged to was cancelled
// before an admin got to it — separated out so the real, actionable
// Pending queue isn't cluttered with dead projects nothing will ever come
// of reviewing.
export function listCancelledSubmissions() {
  return apiFetch("/api/admin/submissions/cancelled");
}

export function reviewSubmission(id, { approved, rejectionReason }) {
  return apiFetch(`/api/admin/submissions/${id}`, {
    method: "PATCH",
    body: { approved, rejectionReason },
  });
}
