// The API Bridge for every real-data project screen (worker + business) —
// every call here hits the real backend (Postgres-backed), never
// PlatformContext mock state.
import { apiFetch } from "./apiClient";

export function listProjects({ role, status, pageSize } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  if (pageSize) params.set("pageSize", String(pageSize));
  const qs = params.toString();
  return apiFetch(`/api/projects${qs ? `?${qs}` : ""}`);
}

// Kept as a thin wrapper — BusinessProjects.jsx's existing call site.
export function listBusinessProjects() {
  return listProjects({ role: "business" });
}

export function getProject(id) {
  return apiFetch(`/api/projects/${id}`);
}

// The Job Board feed — every OPEN, unassigned post, browsable by any
// worker. Registered server-side before GET /:id so "open" is never
// mistaken for a project id.
export function listOpenProjects() {
  return apiFetch("/api/projects/open");
}

// Real effect of the "Featured Employer Spotlight" perk — businesses with
// an active, unconsumed purchase, scoped to their currently-open posts.
export function getFeaturedEmployers() {
  return apiFetch("/api/projects/featured-employers");
}

// Real effect of the "AI Shortlist" perk — 3 workers ranked by real skill
// overlap with this project. Requires an active purchase targeting this
// project (see perksApi.js); the single-use tier is spent on first call.
export function getProjectShortlist(id) {
  return apiFetch(`/api/projects/${id}/shortlist`);
}

// Real effect of the "Enterprise Broadcast" perk — sends a real push +
// in-app notification to the platform's top-rated workers about this post.
export function broadcastProject(id) {
  return apiFetch(`/api/projects/${id}/broadcast`, { method: "POST" });
}

// Deliberately unguarded on the backend (see routes/public.routes.js) — a
// logged-out visitor browsing the Job Board doesn't need an account, only
// applying to one does. apiFetch works fine with no token present.
export function listPublicOpenJobs() {
  return apiFetch("/api/public/open-jobs");
}

// Business creates a project. Passing workerId keeps the original
// direct-invite behavior (project starts INVITED); omitting it posts an
// OPEN job board listing instead — see BusinessPostJob.jsx.
export function createProject({
  workerId,
  title,
  description,
  budget,
  deadline,
  applicationWindow,
  estimatedDuration,
  minExperienceYears,
  maxExperienceYears,
  educationLevel,
  educationNotes,
  requiredSkills,
  isUrgent,
}) {
  return apiFetch("/api/projects", {
    method: "POST",
    body: {
      workerId,
      title,
      description,
      budget,
      deadline,
      applicationWindow,
      estimatedDuration,
      minExperienceYears,
      maxExperienceYears,
      educationLevel,
      educationNotes,
      requiredSkills,
      isUrgent,
    },
  });
}

// Non-terminal FSM steps only — INVITED->ACCEPTED (worker),
// ACCEPTED->WORK_IN_PROGRESS/FILES_SUBMITTED (worker), CANCELLED/DISPUTED.
// FUNDS_SECURED and COMPLETED go through their own atomic endpoints below.
export function updateProjectStatus(id, status, note, evidence) {
  const body = { status };
  if (note) body.note = note;
  if (evidence?.length) body.evidence = evidence;
  return apiFetch(`/api/projects/${id}`, { method: "PATCH", body });
}

// The accused party's one-shot structured response to a dispute — see
// projects.controller.js's raiseDisputeRebuttal.
export function submitDisputeRebuttal(id, statement, evidence) {
  const body = { statement };
  if (evidence?.length) body.evidence = evidence;
  return apiFetch(`/api/projects/${id}/dispute/rebuttal`, { method: "POST", body });
}

// The business's real transfer proof — UTR/transaction ID + a screenshot
// (base64 data URI, same convention as avatar/cover uploads elsewhere).
// Does NOT itself grant FUNDS_SECURED — only moves the project to
// PENDING_FUNDS. WorkBridge staff verifying the transfer (Admin Panel's
// Escrow Funding tab) is what actually grants it. See EscrowFundingDrawer.jsx.
export function fundEscrow(id, { utrReference, screenshotUrl }) {
  return apiFetch(`/api/projects/${id}/fund-escrow`, {
    method: "POST",
    body: { utrReference, screenshotUrl },
  });
}

// Business's "Approve & Release" click — only requests the release
// (FILES_SUBMITTED -> PENDING_RELEASE), no money moves yet. WorkBridge
// staff complete the actual payout from the Admin Panel (see below).
export function requestRelease(id) {
  return apiFetch(`/api/projects/${id}/request-release`, { method: "POST" });
}

// Admin-only — the real payout (PENDING_RELEASE -> COMPLETED).
export function completeProject(id) {
  return apiFetch(`/api/projects/${id}/complete`, { method: "POST" });
}

// The Ghosting Failsafe — instant, business-only, only reachable once
// project.deadline has passed with no delivery. No admin gate, by design.
export function cancelAndRefund(id) {
  return apiFetch(`/api/projects/${id}/cancel-refund`, { method: "POST" });
}

// Budget negotiation — the worker's real counter-offer on the posted
// budget (worker-only, ACCEPTED-only) and the business's real accept/
// decline of it (business-only). See projects.controller.js.
export function proposeBudget(id, budget) {
  return apiFetch(`/api/projects/${id}/propose-budget`, { method: "POST", body: { budget } });
}

export function resolveBudgetProposal(id, approved) {
  return apiFetch(`/api/projects/${id}/resolve-budget`, { method: "POST", body: { approved } });
}
