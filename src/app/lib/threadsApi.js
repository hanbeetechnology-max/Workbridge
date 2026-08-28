// The entity-wide chat — one persistent conversation per (business, worker)
// pair, spanning every project they've ever done together — layered on top
// of (not replacing) the original per-project routes in messagesApi.js.
import { apiFetch } from "./apiClient";

// One row per counterparty, newest activity first — the merged Chats// inbox's thread list.
export function listThreads() {
  return apiFetch(`/api/threads`);
}

export function listThreadMessages(threadId) {
  return apiFetch(`/api/threads/${threadId}/messages`);
}

export function sendThreadMessage(threadId, body, replyToMessageId) {
  return apiFetch(`/api/threads/${threadId}/messages`, {
    method: "POST",
    body: replyToMessageId ? { body, replyToMessageId } : { body },
  });
}

// projectId says which of the (possibly several) live projects with this
// counterparty the deliverable belongs to — required, never inferred.
export function sendThreadLinkMessage({ threadId, projectId, url, caption }) {
  return apiFetch(`/api/threads/${threadId}/messages/attachment`, {
    method: "POST",
    body: { type: "link", url, caption, projectId },
  });
}

export function sendThreadImageMessage({ threadId, projectId, imageData, caption }) {
  return apiFetch(`/api/threads/${threadId}/messages/attachment`, {
    method: "POST",
    body: { type: "image", imageData, caption, projectId },
  });
}
