// Project Lifecycle FSM — the single vocabulary both chat surfaces (Worker
// Negotiation Inbox, Business Inbox) and IdentityHeader read from, so a
// project's status can only ever be one of these four steps, in this order.

export const PROJECT_STATUS_FLOW = [
  "INVITED",
  "ACCEPTED",
  "PENDING_FUNDS",
  "FUNDS_SECURED",
  "WORK_IN_PROGRESS",
  "FILES_SUBMITTED",
  "PENDING_RELEASE",
  "COMPLETED",
];

export const PROJECT_STATUS_META = {
  // triggeredBy: who causes entry INTO this state.
  // actionBy/nextActionLabel: who clicks the Primary Action *while in* this
  // state, and what it's labeled — that click causes the next transition.
  // OPEN is a pre-FSM state (see backend's projectStatus.js) — it never
  // advances via the generic PATCH the other statuses use here, only via
  // the Job Board's candidate-accept endpoint, so it has no actionBy/
  // nextActionLabel of its own.
  OPEN: {
    label: "Open — Accepting Applications",
    shortLabel: "Open",
    tone: "amber",
    triggeredBy: "business",
    actionBy: null,
    nextActionLabel: null,
  },
  INVITED: {
    label: "Invitation Sent",
    shortLabel: "Invited",
    tone: "slate",
    triggeredBy: "business",
    actionBy: "worker",
    nextActionLabel: "Accept Invitation",
  },
  ACCEPTED: {
    label: "Accepted — Awaiting Funds",
    shortLabel: "Accepted",
    tone: "blue",
    triggeredBy: "worker",
    actionBy: "business",
    nextActionLabel: "Secure Funds",
  },
  // The business already submitted transfer proof (UTR + screenshot) — see
  // EscrowFundingDrawer.jsx / fundEscrow in projects.controller.js. Nothing
  // further for either party to click; WorkBridge staff verify the
  // transfer from the Admin Panel's Escrow Funding tab, same shape as
  // PENDING_RELEASE below.
  PENDING_FUNDS: {
    label: "Funds Verification Pending",
    shortLabel: "Verifying Funds",
    tone: "amber",
    triggeredBy: "business",
    actionBy: "admin",
    nextActionLabel: null,
  },
  FUNDS_SECURED: {
    label: "Funds Secured",
    shortLabel: "Secured",
    tone: "emerald",
    triggeredBy: "business",
    actionBy: "worker",
    nextActionLabel: "Start Work",
  },
  WORK_IN_PROGRESS: {
    label: "In Progress",
    shortLabel: "In Progress",
    tone: "blue",
    triggeredBy: "worker",
    actionBy: "worker",
    nextActionLabel: "Submit Work",
  },
  FILES_SUBMITTED: {
    label: "Approval Pending",
    shortLabel: "Pending",
    tone: "amber",
    triggeredBy: "worker",
    actionBy: "business",
    nextActionLabel: "Approve & Release",
  },
  // The business already clicked "Approve & Release" — that only requested
  // the release (see requestRelease in projects.controller.js). Nothing
  // further for the business or worker to click; WorkBridge staff complete
  // the real payout from the Admin Panel's Fund Releases tab.
  PENDING_RELEASE: {
    label: "Release Requested — WorkBridge Review",
    shortLabel: "Release Pending",
    tone: "amber",
    triggeredBy: "business",
    actionBy: "admin",
    nextActionLabel: null,
  },
  COMPLETED: {
    label: "Completed",
    shortLabel: "Completed",
    tone: "emerald",
    triggeredBy: "business",
    actionBy: null,
    nextActionLabel: null,
  },
  // Terminal states reachable from any non-completed status (see backend's
  // canTransition) — not part of PROJECT_STATUS_FLOW's happy-path sequence,
  // but real values every status-label lookup needs to handle.
  DISPUTED: {
    label: "Disputed",
    shortLabel: "Disputed",
    tone: "red",
    triggeredBy: "either party",
    actionBy: "admin",
    nextActionLabel: null,
  },
  CANCELLED: {
    label: "Cancelled",
    shortLabel: "Cancelled",
    tone: "slate",
    triggeredBy: "either party",
    actionBy: null,
    nextActionLabel: null,
  },
};

export function nextProjectStatus(currentStatus) {
  const idx = PROJECT_STATUS_FLOW.indexOf(currentStatus);
  if (idx === -1 || idx === PROJECT_STATUS_FLOW.length - 1) return null;
  return PROJECT_STATUS_FLOW[idx + 1];
}

export function makeTimelineEvent(status) {
  return { status, timestamp: new Date().toISOString() };
}

export function parseAmount(value) {
  return Number(String(value ?? "").replace(/[^0-9.]/g, "")) || 0;
}
