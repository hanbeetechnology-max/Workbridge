import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  BadgeCheck,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  IndianRupee,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Pencil,
  ShieldCheck,
  ShieldOff,
  UserX,
  X,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import IdentityHeader from "../shared/IdentityHeader";
import DeliverablesPanel from "../shared/DeliverablesPanel";
import ChatThread from "../shared/ChatThread";
import { listProjects, updateProjectStatus, proposeBudget } from "../../lib/projectsApi";
import { listThreads } from "../../lib/threadsApi";
import { getBlockStatus, blockUser, unblockUser } from "../../lib/blocksApi";
import { getInitials } from "../../utils/formValidation";
import { ApiError } from "../../lib/apiClient";
import { getSocket } from "../../lib/socketClient";
import { useAuth } from "../../context/AuthContext";

// A project only ever gets a real chat_threads row once it has a real
// worker_id (see backend's threads.repository.js) — every status below
// always has one, OPEN never does. Extended to include COMPLETED/CANCELLED
// — Negotiations is the single unified chat inbox across every project
// stage, not just the pre-acceptance stage the name originally implied.
const ACTIVE_THREAD_STATUSES = new Set([
  "INVITED",
  "ACCEPTED",
  "PENDING_FUNDS",
  "FUNDS_SECURED",
  "WORK_IN_PROGRESS",
  "FILES_SUBMITTED",
  "PENDING_RELEASE",
  "COMPLETED",
  "CANCELLED",
]);
const CLOSED_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

// PENDING_FUNDS deliberately excluded — funds aren't secured yet, only
// submitted for verification (see EscrowFundingDrawer.jsx). Mirrors
// BusinessNegotiationHub.jsx's identical constant.
const FUNDS_SECURED_STATUSES = new Set(["FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED", "PENDING_RELEASE"]);

function formatINR(amount) {
  return `INR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function isActiveThread(project) {
  return ACTIVE_THREAD_STATUSES.has(project.status);
}

// The Job Details modal's own "how long the work takes" field — distinct
// from formatDueDate below (the chat header's "due by" pill).
function formatDuration(deadline) {
  if (!deadline) return "Flexible timeline";
  const ms = new Date(deadline).getTime() - Date.now();
  const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

// Matches BusinessNegotiationHub.jsx's formatDueDate exactly, for the same
// absolute-date "Due 19 Aug" pill on both sides of one conversation.
function formatDueDate(deadline) {
  if (!deadline) return "Flexible timeline";
  return new Date(deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function getProjectStatus(project) {
  if (project.status === "INVITED") return { label: "Pending Invite", className: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-900/40" };
  if (project.status === "ACCEPTED") return { label: "Negotiating", className: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-900/40" };
  if (project.status === "PENDING_FUNDS") return { label: "Verifying Funds", className: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40" };
  if (project.status === "FUNDS_SECURED") return { label: "Funds Secured", className: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40" };
  if (project.status === "WORK_IN_PROGRESS") return { label: "In Progress", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" };
  if (project.status === "FILES_SUBMITTED") return { label: "In Review", className: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40" };
  if (project.status === "COMPLETED") return { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40" };
  if (project.status === "CANCELLED") return { label: "Cancelled", className: "bg-slate-100 text-slate-500 dark:text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700" };
  return { label: project.status ?? "Active", className: "bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:bg-slate-800 dark:border-slate-700" };
}

// The sidebar row's own summary badge — one counterparty can be behind
// several projects at once, so this rolls them up: a still-undecided invite
// always wins (it needs a response), otherwise how many are live right now,
// otherwise it's pure history.
function getThreadBadge(group) {
  if (group.some((p) => p.status === "INVITED")) {
    return { label: "Pending Invite", className: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-900/40" };
  }
  const activeCount = group.filter((p) => !CLOSED_STATUSES.has(p.status)).length;
  if (activeCount > 0) {
    return { label: activeCount === 1 ? "Active" : `${activeCount} Active`, className: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-900/40" };
  }
  return { label: "History", className: "bg-slate-100 text-slate-500 dark:text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700" };
}

function MotionPanel({ children, panelKey }) {
  return (
    <motion.div
      key={panelKey}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function FieldPill({ icon: Icon, label, value, dark = false }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${
        dark
          ? "border-emerald-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900 dark:text-white dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${dark ? "text-emerald-300" : "text-slate-400 dark:text-slate-500"}`} />
        <p className={`text-[11px] font-bold uppercase tracking-wide ${dark ? "text-emerald-200" : "text-slate-500 dark:text-slate-400"}`}>
          {label}
        </p>
      </div>
      <p className={`mt-1 text-sm font-bold ${dark ? "text-emerald-100" : "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

// The Inbox List — one row per counterparty (a business), not one per
// project, exactly the WhatsApp-style grouping this replaced 14 separate
// rows for the same business with. What used to be a per-thread "View
// Details" button now lives as project chips in the chat header instead
// (ChatPanel below) — with several projects possibly sharing one merged
// conversation, "View Details" on the row itself would be ambiguous about
// which one it means.
function ThreadNavigator({ threads, groupsByCounterparty, selectedThreadId, onSelect }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
      <div className="flex-shrink-0 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">All Conversations</p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{threads.length} conversation{threads.length === 1 ? "" : "s"}</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800">
            Live
          </span>
        </div>
      </div>

      <div className="wb-scroll-clean min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {threads.map((thread) => {
          const selected = thread.id === selectedThreadId;
          const group = groupsByCounterparty.get(thread.other_user_id) ?? [];
          const badge = getThreadBadge(group);
          const preview = thread.last_message_body || "No messages yet";

          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${
                selected
                  ? "border-slate-200 border-l-4 border-l-[#FF6B35] bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  : "border-transparent border-l-4 border-l-transparent bg-white hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:hover:border-slate-800 dark:hover:bg-slate-900"
              }`}
            >
              {thread.other_avatar_url ? (
                <img
                  src={thread.other_avatar_url}
                  alt={thread.other_name}
                  className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <Avatar initials={getInitials(thread.other_name)} bg="bg-[#1B3FAB]" size="w-11 h-11" text="text-xs" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{thread.other_name}</p>
                  <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{preview}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function JobDetailsPanel({ project }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Job invitation</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {project.title}
          </h2>
        </div>
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35] ring-1 ring-orange-100 dark:bg-orange-500/10 dark:ring-orange-900/40">
          <Briefcase className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <FieldPill icon={IndianRupee} label="Budget" value={formatINR(project.budget)} dark />
        <FieldPill icon={Clock3} label="Duration" value={formatDuration(project.deadline)} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Description</p>
        <p className="mt-2 max-h-44 overflow-y-auto pr-1 text-sm leading-6 text-slate-600 dark:text-slate-300 wb-scroll-clean">
          {project.description || "The client didn't add any extra details for this project."}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-500/10">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#1B3FAB] dark:text-blue-400" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Terms stay protected</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Accepting locks in the scope, budget, and timeline — no surprises later.
            </p>
          </div>
        </div>
      </div>

      {/* Reference material the business attached at invite time (Post a Job
          / Find Workers) — same admin-approval rule as any other submission. */}
      <div className="mt-5">
        <DeliverablesPanel projectId={project.id} />
      </div>
    </div>
  );
}

// The Details Modal — portaled to document.body so it's never at risk of
// the "ancestor with a lingering CSS transform becomes the containing block
// for position:fixed" trap other overlays in this app hit when nested
// inside a tab's own .wb-tab-enter root (see BusinessProjects.jsx's modals
// for the full writeup of that bug). The close button floats over the
// backdrop rather than sitting inside the card, so it never collides with
// the card's own header content. The card's own scroll keeps working via
// wheel/touch/keyboard — .wb-scroll-clean only hides the visible track.
function JobDetailsModal({ project, onClose, onDecline, onAccept, actionBusy, actionError }) {
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  useEffect(() => {
    setConfirmingDecline(false);
  }, [project?.id]);

  if (!project) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed right-6 top-6 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl wb-scroll-clean dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        {actionError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <MotionPanel panelKey={project.id}>
            <JobDetailsPanel project={project} />
            {project.status === "INVITED" ? (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={actionBusy}
                  className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-5 py-4 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#e85d27] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {actionBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Locking terms…
                    </>
                  ) : (
                    <>
                      <LockKeyhole className="h-4 w-4" />
                      Accept Invitation & Lock Terms
                    </>
                  )}
                </button>
                {confirmingDecline ? (
                  // Declining cancels the project outright — one extra
                  // confirmation click so it can't be triggered by the same
                  // fat-finger tap that was aiming for Accept right above it.
                  <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
                    <span className="flex-1 text-xs font-bold text-red-700 dark:text-red-400">Decline this invitation?</span>
                    <button
                      type="button"
                      onClick={onDecline}
                      disabled={actionBusy}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDecline(false)}
                      disabled={actionBusy}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-slate-900 dark:hover:bg-red-950/30"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDecline(true)}
                    disabled={actionBusy}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </button>
                )}
              </div>
            ) : (
              // Already acted on — Accept/Decline only ever make sense once,
              // on a still-INVITED project. Re-opening "View Details" on a
              // thread you've already accepted used to show the exact same
              // Accept button again, as if nothing had happened.
              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Check className="h-4 w-4 flex-shrink-0" />
                You've already accepted this invitation — track it in Active Workspace.
              </div>
            )}
          </MotionPanel>
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
}

// A horizontal strip like the project-chip row only scrolls via a plain
// mouse wheel if the browser happens to redirect vertical scroll for you —
// it doesn't, by default. This redirects it so hovering anywhere on the
// strip scrolls it, the same as any real card carousel. A real horizontal
// gesture (trackpad two-finger swipe, Shift+wheel) already arrives as
// deltaX and is left alone — overflow-x-auto handles that natively, and
// intercepting it too caused the two handlers to fight each other, which is
// what broke scrolling here previously. Also no-ops (and lets the vertical
// scroll bubble to the page normally) when the strip has nothing to scroll.
function handleHorizontalWheelScroll(event) {
  const el = event.currentTarget;
  if (el.scrollWidth <= el.clientWidth) return;
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  event.preventDefault();
  el.scrollLeft += event.deltaY;
}

// One small pill per project under this counterparty — active ones full
// contrast, closed ones muted but still clickable (the merged view keeps
// the whole relationship's history visible, nothing just vanishes).
function ProjectChip({ project, onClick }) {
  const status = getProjectStatus(project);
  const isClosed = CLOSED_STATUSES.has(project.status);
  return (
    <button
      type="button"
      onClick={() => onClick(project)}
      className={`flex flex-shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        isClosed ? "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-800/60" : "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
      <div className="min-w-0">
        <p className="max-w-[140px] truncate text-xs font-bold text-slate-900 dark:text-white">{project.title}</p>
        <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${status.className}`}>
          {status.label}
        </span>
      </div>
    </button>
  );
}

// The Right Pane — unconditionally flex-1, fills whatever width the thread
// list leaves behind. Mirrors BusinessNegotiationHub.jsx's HubHeader exactly
// (IdentityHeader + due/budget pills + an escrow-status pill for whichever
// project needs attention most) so both sides of one conversation present
// the same information density — previously this side was a plain "Chat
// with X" label with none of that. The project chip strip is what replaced
// the old single-project header now that one merged conversation
// (ChatThread, shared/ChatThread.jsx) can span several projects at once.
function ChatPanel({ thread, projects, onViewDetails, onProjectUpdated }) {
  const { isImpersonating } = useAuth();
  const activeProjects = useMemo(() => projects.filter((p) => !CLOSED_STATUSES.has(p.status)), [projects]);
  const historyProjects = useMemo(() => projects.filter((p) => CLOSED_STATUSES.has(p.status)), [projects]);
  const completedCount = useMemo(() => projects.filter((p) => p.status === "COMPLETED").length, [projects]);
  const ongoingCount = useMemo(() => projects.filter((p) => !CLOSED_STATUSES.has(p.status)).length, [projects]);
  const mostUrgent = projects.find((p) => !CLOSED_STATUSES.has(p.status)) ?? projects[0] ?? null;
  const fundsSecured = mostUrgent ? FUNDS_SECURED_STATUSES.has(mostUrgent.status) : false;
  const isPaidOut = mostUrgent?.status === "COMPLETED";
  const isCancelled = mostUrgent?.status === "CANCELLED";

  // The posted budget is no longer fixed — while a project sits ACCEPTED
  // (funds not yet secured), the worker can propose a real counter-offer;
  // the business accepts or declines it from their own side (see
  // BusinessNegotiationHub.jsx's mirror of this). Reset whenever the
  // underlying project changes so a stale draft never bleeds into a
  // different thread.
  const [proposingBudget, setProposingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetError, setBudgetError] = useState("");

  useEffect(() => {
    setProposingBudget(false);
    setBudgetDraft("");
    setBudgetError("");
  }, [mostUrgent?.id]);

  const handleProposeBudget = async () => {
    const amount = Number(budgetDraft);
    if (!mostUrgent || !amount || amount <= 0) {
      setBudgetError("Enter a real amount.");
      return;
    }
    setBudgetSubmitting(true);
    setBudgetError("");
    try {
      const updated = await proposeBudget(mostUrgent.id, amount);
      onProjectUpdated?.(updated);
      setProposingBudget(false);
      setBudgetDraft("");
    } catch (err) {
      setBudgetError(err instanceof ApiError ? err.message : "Could not send this proposal.");
    } finally {
      setBudgetSubmitting(false);
    }
  };

  // Block/Unblock now lives here (in the header row) rather than as its
  // own separate bar inside ChatThread — same real, mutual, WhatsApp-style
  // block, just owned by the parent so it can sit next to the other status
  // badges instead of on its own line.
  const [blockStatus, setBlockStatus] = useState({ blockedByMe: false, blockedMe: false });
  const [blockActionBusy, setBlockActionBusy] = useState(false);
  const otherUserId = thread.other_user_id;

  useEffect(() => {
    if (!otherUserId) return;
    getBlockStatus(otherUserId).then(setBlockStatus).catch(() => {});
  }, [otherUserId]);

  // Same discoverable scroll affordance as BusinessNegotiationHub.jsx's chip
  // row — wb-scroll-clean hides the native scrollbar, so without these
  // arrows an overflowing row just looked cut off with no hint of more.
  const chipStripRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateChipScrollState = () => {
    const el = chipStripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateChipScrollState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const scrollChips = (direction) => {
    chipStripRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  const handleBlock = async () => {
    if (!otherUserId || blockActionBusy) return;
    setBlockActionBusy(true);
    try {
      await blockUser(otherUserId);
      setBlockStatus((prev) => ({ ...prev, blockedByMe: true }));
    } catch {
      // Non-critical — the button just stays clickable to retry.
    } finally {
      setBlockActionBusy(false);
    }
  };

  const handleUnblock = async () => {
    if (!otherUserId || blockActionBusy) return;
    setBlockActionBusy(true);
    try {
      await unblockUser(otherUserId);
      setBlockStatus((prev) => ({ ...prev, blockedByMe: false }));
    } catch {
      // Non-critical — the button just stays clickable to retry.
    } finally {
      setBlockActionBusy(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-10 flex-shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center justify-between gap-4 pr-6">
          <div className="min-w-0 flex-1 [&>div]:border-b-0 [&>div]:bg-transparent">
            <IdentityHeader
              name={thread.other_name}
              subtitle={projects.length === 1 ? projects[0].title : undefined}
              initials={getInitials(thread.other_name)}
              avatarUrl={thread.other_avatar_url}
              avatarBg="bg-[#1B3FAB]"
              verified
            />
            {(ongoingCount > 0 || completedCount > 0) && (
              <div className="-mt-2 flex items-center gap-2.5 pb-3 pl-[68px] text-[11px] font-semibold text-slate-400 dark:text-slate-500 sm:pl-[76px]">
                {ongoingCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Ongoing: {ongoingCount}
                  </span>
                )}
                {completedCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Completed: {completedCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {mostUrgent ? (
            <span
              className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                isCancelled
                  ? "border-slate-200 bg-slate-100 text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  : isPaidOut || fundsSecured
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isCancelled ? "Cancelled" : isPaidOut ? "Paid Out" : fundsSecured ? "Funds Secured" : "Awaiting Funds"}
            </span>
          ) : (
            <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" />
              On WorkBridge
            </span>
          )}
          {otherUserId && !blockStatus.blockedMe && (
            blockStatus.blockedByMe ? (
              <button
                type="button"
                onClick={handleUnblock}
                disabled={blockActionBusy || isImpersonating}
                title={isImpersonating ? "Disabled in Impersonation Mode" : undefined}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              >
                <ShieldOff className="h-3.5 w-3.5" />
                {isImpersonating ? "Disabled" : "Unblock"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBlock}
                disabled={blockActionBusy || isImpersonating}
                title={isImpersonating ? "Disabled in Impersonation Mode" : undefined}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-900/40 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              >
                <UserX className="h-3.5 w-3.5" />
                {isImpersonating ? "Disabled" : "Block"}
              </button>
            )
          )}
        </div>

        {mostUrgent && (
          <div className="flex flex-wrap items-center gap-3 px-6 pb-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              <Clock3 className="h-3.5 w-3.5" />
              Due {formatDueDate(mostUrgent.deadline)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              <IndianRupee className="h-3.5 w-3.5 text-[#FF6B35]" />
              {formatINR(mostUrgent.budget)}
            </span>

            {/* Budget negotiation — only while ACCEPTED (pre-funding); once
                funds are secured the escrowed amount is locked. */}
            {mostUrgent.status === "ACCEPTED" && (
              mostUrgent.proposed_budget ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                  <Pencil className="h-3.5 w-3.5" />
                  You proposed {formatINR(mostUrgent.proposed_budget)} — awaiting response
                </span>
              ) : !proposingBudget ? (
                <button
                  type="button"
                  onClick={() => setProposingBudget(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1B3FAB] shadow-sm transition-colors hover:bg-[#F4F6FF] dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-[#1B3FAB]/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Propose New Budget
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="number"
                      min="1"
                      autoFocus
                      value={budgetDraft}
                      onChange={(event) => setBudgetDraft(event.target.value)}
                      placeholder="New amount"
                      className="h-8 w-32 rounded-full border border-slate-200 bg-white pl-7 pr-2 text-xs font-bold text-slate-900 outline-none focus:border-[#1B3FAB] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleProposeBudget}
                    disabled={budgetSubmitting}
                    className="flex h-8 items-center gap-1 rounded-full bg-[#1B3FAB] px-3 text-xs font-bold text-white transition-colors hover:bg-[#16327A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {budgetSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProposingBudget(false);
                      setBudgetError("");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            )}
            {budgetError && <span className="w-full text-xs font-semibold text-red-500 dark:text-red-400">{budgetError}</span>}
          </div>
        )}

        {projects.length > 0 && (
          <div className="relative flex items-center">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollChips(-1)}
                aria-label="Scroll projects left"
                className="absolute left-1 z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              ref={chipStripRef}
              onScroll={updateChipScrollState}
              onWheel={handleHorizontalWheelScroll}
              className="wb-scroll-clean flex scroll-smooth gap-2 overflow-x-auto px-6 pb-4"
            >
              {activeProjects.map((project) => (
                <ProjectChip key={project.id} project={project} onClick={onViewDetails} />
              ))}
              {/* Cancelled/declined projects don't belong in this strip —
                  only what's actually still active or genuinely finished. */}
              {historyProjects.filter((p) => p.status !== "CANCELLED").map((project) => (
                <ProjectChip key={project.id} project={project} onClick={onViewDetails} />
              ))}
            </div>
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollChips(1)}
                aria-label="Scroll projects right"
                className="absolute right-1 z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* No longer read-only once closed — the chat stays preserved AND
          usable (a business/worker might still need to follow up after a
          project ends), same as any real messaging app. Only a real,
          mutual, WhatsApp-style block gates the composer now. */}
      <ChatThread
        threadId={thread.id}
        otherUserId={thread.other_user_id}
        activeProjects={activeProjects.map((p) => ({ id: p.id, title: p.title }))}
        projectIds={projects.map((p) => p.id)}
        blockStatus={blockStatus}
        blockActionBusy={blockActionBusy}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
      />
    </section>
  );
}

export default function WorkerNegotiationInbox({ initialProjectId }) {
  const [threads, setThreads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    // pageSize: 100 (the API's max) rather than the default 20 — Chats    // needs every project with every counterparty, not just the 20 most
    // recent across the whole account, or an older project could silently
    // fall off a thread's own history here.
    Promise.all([listThreads(), listProjects({ role: "worker", pageSize: 100 })])
      .then(([threadsData, projectsData]) => {
        if (cancelled) return;
        setThreads(threadsData);
        setProjects(projectsData);
        const initialProject = projectsData.find((p) => p.id === initialProjectId);
        const preferred =
          (initialProject && threadsData.find((t) => t.other_user_id === initialProject.business_id)) ??
          threadsData.find((t) =>
            projectsData.some((p) => p.business_id === t.other_user_id && p.status === "INVITED")
          ) ??
          threadsData[0] ??
          null;
        setSelectedThreadId(preferred?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your invitations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialProjectId]);

  // A brand-new invite, an accepted candidacy, or just a new message — any
  // of these can change what the thread list should show (a new row, a
  // reordered preview). No local toast here — WorkerDashboard.jsx already
  // shows one globally for PROJECT_CREATED; duplicating it would double up
  // since both are mounted together.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (event.type === "MESSAGE_CREATED") {
        listThreads().then(setThreads).catch(() => {});
      } else if (event.type === "PROJECT_CREATED" || event.type === "CANDIDATE_ACCEPTED") {
        Promise.all([listThreads(), listProjects({ role: "worker", pageSize: 100 })])
          .then(([t, p]) => {
            setThreads(t);
            setProjects(p);
          })
          .catch(() => {});
      }
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
  }, []);

  // One counterparty (a business) can be behind several projects — grouped
  // client-side from the same real project list Active Workspace/Wallet
  // already use, keyed by business_id, so each thread row's chips and the
  // ChatThread attachment picker always reflect real project data with no
  // second source of truth.
  const projectsByCounterparty = useMemo(() => {
    const map = new Map();
    for (const project of projects) {
      if (!isActiveThread(project)) continue;
      if (!map.has(project.business_id)) map.set(project.business_id, []);
      map.get(project.business_id).push(project);
    }
    return map;
  }, [projects]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );
  const selectedGroup = selectedThread ? projectsByCounterparty.get(selectedThread.other_user_id) ?? [] : [];

  const patchProject = (updated) => {
    setProjects((current) => current.map((project) => (project.id === updated.id ? { ...project, ...updated } : project)));
  };

  const openDetails = (project) => {
    setSelectedJobDetails(project);
    setActionError("");
  };

  const closeDetails = () => {
    setSelectedJobDetails(null);
  };

  // One click, one action — no separate "wizard" screen in between. Confirm
  // once, and it's accepted.
  const handleAccept = async () => {
    if (!selectedJobDetails) return;
    setActionBusy(true);
    setActionError("");
    try {
      if (selectedJobDetails.status === "INVITED") {
        const updated = await updateProjectStatus(selectedJobDetails.id, "ACCEPTED");
        patchProject(updated);
      }
      closeDetails();
      setToast("Terms locked. Project moved into your workspace.");
      window.setTimeout(() => setToast(""), 2600);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not lock this invitation.");
    } finally {
      setActionBusy(false);
    }
  };

  // A real CANCELLED transition (an allowed FSM move from INVITED for
  // either participant — see backend's canTransition), patched in place
  // rather than removed from the list — a declined invite becomes history,
  // same as any other closed project, not something that just vanishes.
  const handleDecline = async () => {
    if (!selectedJobDetails) return;
    setActionBusy(true);
    setActionError("");
    try {
      const updated = await updateProjectStatus(selectedJobDetails.id, "CANCELLED");
      patchProject(updated);
      closeDetails();
      setToast("Invitation declined.");
      window.setTimeout(() => setToast(""), 2200);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not decline this invitation.");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-7 dark:bg-slate-950">
        <div className="flex max-w-md items-start gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600 shadow-sm dark:border-red-900/40 dark:bg-slate-900 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  if (!selectedThread) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-7 dark:bg-slate-950">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No conversations yet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your Hub for Invites, Chats, and Past Chats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-white dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <aside className="flex h-full min-h-0 w-[360px] flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
        <ThreadNavigator
          threads={threads}
          groupsByCounterparty={projectsByCounterparty}
          selectedThreadId={selectedThreadId}
          onSelect={setSelectedThreadId}
        />
      </aside>

      <ChatPanel thread={selectedThread} projects={selectedGroup} onViewDetails={openDetails} onProjectUpdated={patchProject} />

      <JobDetailsModal
        project={selectedJobDetails}
        onClose={closeDetails}
        onDecline={handleDecline}
        onAccept={handleAccept}
        actionBusy={actionBusy}
        actionError={actionError}
      />

      {toast && (
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-md dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
