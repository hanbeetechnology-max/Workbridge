import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserX,
  Users,
  X,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import IdentityHeader from "../shared/IdentityHeader";
import ChatThread from "../shared/ChatThread";
import { listProjects, resolveBudgetProposal } from "../../lib/projectsApi";
import { listThreads } from "../../lib/threadsApi";
import { getBlockStatus, blockUser, unblockUser } from "../../lib/blocksApi";
import { getInitials } from "../../utils/formValidation";
import { ApiError } from "../../lib/apiClient";
import { getSocket } from "../../lib/socketClient";
import { useAuth } from "../../context/AuthContext";

// A project only ever gets a real chat_threads row once it has a real
// worker_id (see backend's threads.repository.js) — every status below
// always has one, OPEN never does. Extended to include PENDING_RELEASE/
// COMPLETED/CANCELLED — this is the single unified chat inbox across every
// project stage, not just the pre-completion stage the original "active"
// definition implied. Mirrors WorkerNegotiationInbox.jsx.
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
// submitted for verification (see EscrowFundingDrawer.jsx).
const FUNDS_SECURED_STATUSES = new Set(["FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED", "PENDING_RELEASE"]);

const STATUS_META = {
  INVITED: { label: "Awaiting Response", tone: "amber" },
  ACCEPTED: { label: "Negotiating", tone: "blue" },
  PENDING_FUNDS: { label: "Verifying Funds", tone: "amber" },
  FUNDS_SECURED: { label: "Funds Secured", tone: "emerald" },
  WORK_IN_PROGRESS: { label: "In Progress", tone: "blue" },
  FILES_SUBMITTED: { label: "Review Pending", tone: "amber" },
  PENDING_RELEASE: { label: "Release Pending", tone: "amber" },
  COMPLETED: { label: "Completed", tone: "emerald" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

const TONE_CLASSES = {
  amber: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400",
  blue: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400",
  slate: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function formatINR(amount) {
  return `INR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDueDate(deadline) {
  if (!deadline) return "Flexible timeline";
  return new Date(deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function isActiveThread(project) {
  return ACTIVE_THREAD_STATUSES.has(project.status) && Boolean(project.worker_id);
}

function getProjectStatus(project) {
  return STATUS_META[project.status] ?? { label: project.status ?? "Active", tone: "blue" };
}

// One counterparty (a worker) can be behind several projects — this rolls
// the group up into the navigator row's single badge, same rule as
// WorkerNegotiationInbox.jsx's mirror.
function getThreadBadge(group) {
  const activeCount = group.filter((p) => !CLOSED_STATUSES.has(p.status)).length;
  if (activeCount > 0) {
    const tone = group.some((p) => p.status === "INVITED") ? "amber" : "blue";
    return { label: activeCount === 1 ? "Active" : `${activeCount} Active`, tone };
  }
  return { label: "History", tone: "slate" };
}

function ThreadNavigator({ threads, groupsByCounterparty, selectedThreadId, onSelect }) {
  // Was a plain styled <div> with no input, no state, no filtering — looked
  // like a search box but typing into it did nothing. Filters by counterpart
  // name or the last message preview, both already in `threads`.
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleThreads = normalizedQuery
    ? threads.filter((t) =>
        (t.other_name ?? "").toLowerCase().includes(normalizedQuery) ||
        (t.last_message_body ?? "").toLowerCase().includes(normalizedQuery)
      )
    : threads;

  return (
    <aside className="flex h-full w-[340px] flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="border-b border-slate-200 bg-white/70 px-5 py-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Chats          </h1>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
            {threads.length} {threads.length === 1 ? "Conversation" : "Conversations"}
          </span>
        </div>

        <div className="mt-5 flex min-h-[44px] items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 dark:border-slate-700 dark:bg-slate-800/60">
          <Search className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads"
            className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-semibold dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="wb-scroll-clean min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {visibleThreads.length === 0 && (
          <p className="px-2 py-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
            No conversations match "{query}"
          </p>
        )}
        {visibleThreads.map((thread) => {
          const selected = thread.id === selectedThreadId;
          const group = groupsByCounterparty.get(thread.other_user_id) ?? [];
          const badge = getThreadBadge(group);
          const preview = thread.last_message_body || "No messages yet";

          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`mb-3 flex w-full items-center gap-3 rounded-2xl border py-3.5 pl-3 pr-3 text-left transition ${
                selected
                  ? "border-slate-200 border-l-4 border-l-[#FF6B35] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  : "border-transparent border-l-4 border-l-transparent bg-transparent hover:border-slate-200 hover:bg-white/70 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
              }`}
            >
              {thread.other_avatar_url ? (
                <img
                  src={thread.other_avatar_url}
                  alt={thread.other_name}
                  className="h-10 w-10 flex-shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <Avatar initials={getInitials(thread.other_name)} bg="bg-[#1B3FAB]" size="w-10 h-10" text="text-xs" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {thread.other_name}
                  </p>
                  <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {preview}
                </p>
              </div>
              <span className={`flex-shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${TONE_CLASSES[badge.tone]}`}>
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function NoThreadSelected({ hasThreads, onFindTalent }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-white px-8 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-orange-100 bg-slate-50 shadow-sm dark:border-orange-900/40 dark:bg-slate-800">
          <Users className="h-11 w-11 text-[#FF6B35]" />
        </div>
        <h2 className="mt-7 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {hasThreads ? "Select a conversation to begin" : "No active negotiations"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {hasThreads
            ? "Choose a worker thread from the navigator to review contract status and continue the conversation."
            : "Browse candidates to get started. Once you invite a worker, the secure negotiation thread will appear here."}
        </p>
        {!hasThreads && (
          <button
            type="button"
            onClick={onFindTalent}
            className="mt-7 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] px-6 text-sm font-black text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#e85d27]"
          >
            <Search className="h-4 w-4" />
            Find Talent
          </button>
        )}
      </div>
    </div>
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

// One project chip per real project with this worker — active ones full
// contrast, closed ones muted but still clickable. Replaced the old header's
// single project's budget/deadline/escrow strip, which no longer makes
// sense once one merged conversation can span several projects at once.
function ProjectChip({ project, onClick }) {
  const status = getProjectStatus(project);
  const isClosed = CLOSED_STATUSES.has(project.status);
  return (
    <button
      type="button"
      onClick={() => onClick(project)}
      className={`flex flex-shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        isClosed ? "border-slate-200 bg-white/60 opacity-70 dark:border-slate-700 dark:bg-slate-800/60" : "border-slate-200 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
      }`}
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
      <div className="min-w-0">
        <p className="max-w-[140px] truncate text-xs font-bold text-slate-900 dark:text-white">{project.title}</p>
        <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${TONE_CLASSES[status.tone]}`}>
          {status.label}
        </span>
      </div>
    </button>
  );
}

function HubHeader({ thread, projects, onViewContractTerms, onProjectUpdated, blockStatus, blockActionBusy, onBlock, onUnblock }) {
  const { isImpersonating } = useAuth();
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;
  const ongoingCount = projects.filter((p) => !CLOSED_STATUSES.has(p.status)).length;
  const mostUrgent = projects.find((p) => !CLOSED_STATUSES.has(p.status)) ?? projects[0] ?? null;
  const fundsSecured = mostUrgent ? FUNDS_SECURED_STATUSES.has(mostUrgent.status) : false;
  const isPaidOut = mostUrgent?.status === "COMPLETED";
  const isCancelled = mostUrgent?.status === "CANCELLED";
  const otherUserId = thread.other_user_id;

  // The worker's real counter-offer on this project's budget (see
  // WorkerNegotiationInbox.jsx's mirror, which is the only place one gets
  // created) — accept writes it into the real budget; decline just clears
  // it. Reset whenever the underlying project changes so a stale busy/error
  // state never bleeds into a different thread.
  const [resolvingBudget, setResolvingBudget] = useState(false);
  const [budgetResolveError, setBudgetResolveError] = useState("");

  useEffect(() => {
    setResolvingBudget(false);
    setBudgetResolveError("");
  }, [mostUrgent?.id]);

  const handleResolveBudget = async (approved) => {
    if (!mostUrgent) return;
    setResolvingBudget(true);
    setBudgetResolveError("");
    try {
      const updated = await resolveBudgetProposal(mostUrgent.id, approved);
      onProjectUpdated?.(updated);
    } catch (err) {
      setBudgetResolveError(err instanceof ApiError ? err.message : "Could not resolve this proposal.");
    } finally {
      setResolvingBudget(false);
    }
  };

  // The chip strip hides its native scrollbar (wb-scroll-clean) for a
  // cleaner look, but with nothing visible in its place a row that overflows
  // just looked cut off mid-chip with no hint there was more to see. These
  // arrows are the discoverable, click-only way to reach it — they only
  // render on the side that actually has more to scroll to.
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

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between gap-5 px-6 py-4">
        <div className="min-w-0 flex-1 [&>div]:border-b-0 [&>div]:bg-transparent [&>div]:px-0 [&>div]:py-0">
          <IdentityHeader
            name={thread.other_name}
            subtitle={projects.length === 1 ? projects[0].title : undefined}
            initials={getInitials(thread.other_name)}
            avatarUrl={thread.other_avatar_url}
            avatarBg="bg-[#1B3FAB]"
            verified
          />
          {(ongoingCount > 0 || completedCount > 0) && (
            <div className="mt-1 flex items-center gap-2.5 pl-[52px] text-[11px] font-semibold text-slate-400 dark:text-slate-500">
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

        {mostUrgent && (
          <div className="flex flex-shrink-0 items-center gap-3">
            <span
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-xs font-black ${
                isCancelled
                  ? "border-slate-200 bg-slate-100 text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  : isPaidOut || fundsSecured
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {isCancelled ? "Cancelled" : isPaidOut ? "Paid Out" : fundsSecured ? "Funds Secured" : "Awaiting Funds"}
            </span>
            <button
              type="button"
              onClick={() => onViewContractTerms?.(mostUrgent)}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 text-sm font-black text-[#FF6B35] shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-500/10 dark:hover:bg-orange-500/20"
            >
              <FileText className="h-4 w-4" />
              View Contract
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}
        {otherUserId && !blockStatus.blockedMe && (
          blockStatus.blockedByMe ? (
            <button
              type="button"
              onClick={onUnblock}
              disabled={blockActionBusy || isImpersonating}
              title={isImpersonating ? "Disabled in Impersonation Mode" : undefined}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700 shadow-sm transition-all active:scale-[0.98] hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              {isImpersonating ? "Disabled" : "Unblock"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onBlock}
              disabled={blockActionBusy || isImpersonating}
              title={isImpersonating ? "Disabled in Impersonation Mode" : undefined}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-500 shadow-sm transition-all active:scale-[0.98] hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-red-900/40 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <UserX className="h-3.5 w-3.5" />
              {isImpersonating ? "Disabled" : "Block"}
            </button>
          )
        )}
      </div>

      {mostUrgent && (
        <div className="flex flex-wrap items-center gap-3 px-6 pb-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/70">
            <Clock3 className="h-3.5 w-3.5" />
            Due {formatDueDate(mostUrgent.deadline)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/70">
            <Sparkles className="h-3.5 w-3.5 text-[#FF6B35]" />
            {formatINR(mostUrgent.budget)}
          </span>

          {/* The worker's real counter-offer — only ever set while
              ACCEPTED (pre-funding); see WorkerNegotiationInbox.jsx's
              propose UI, the only place this gets created. */}
          {mostUrgent.proposed_budget && (
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-900/40 dark:bg-amber-950/30">
              <Pencil className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Proposed {formatINR(mostUrgent.proposed_budget)}
              </span>
              <button
                type="button"
                onClick={() => handleResolveBudget(true)}
                disabled={resolvingBudget}
                title="Accept this budget"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white transition-all active:scale-[0.92] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resolvingBudget ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleResolveBudget(false)}
                disabled={resolvingBudget}
                title="Decline this budget"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 text-amber-600 transition-all active:scale-[0.92] hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {budgetResolveError && <span className="w-full text-xs font-semibold text-red-500 dark:text-red-400">{budgetResolveError}</span>}
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
            {/* Cancelled/declined projects don't belong in this strip — only
                what's actually still active or genuinely finished. */}
            {projects.filter((p) => p.status !== "CANCELLED").map((project) => (
              <ProjectChip key={project.id} project={project} onClick={onViewContractTerms} />
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
  );
}

// The feed/composer are ChatThread (shared/ChatThread.jsx) — a real,
// persisted conversation that spans every project with this worker, not
// just one.
function FocusHub({ thread, projects, onViewContractTerms, onProjectUpdated }) {
  const activeProjects = useMemo(() => projects.filter((p) => !CLOSED_STATUSES.has(p.status)), [projects]);

  // Block/Unblock now lives in HubHeader's own row rather than as its own
  // separate bar inside ChatThread — same real, mutual, WhatsApp-style
  // block, owned here so both the header button and the composer's gating
  // stay in sync off the one fetch.
  const [blockStatus, setBlockStatus] = useState({ blockedByMe: false, blockedMe: false });
  const [blockActionBusy, setBlockActionBusy] = useState(false);
  const otherUserId = thread.other_user_id;

  useEffect(() => {
    if (!otherUserId) return;
    getBlockStatus(otherUserId).then(setBlockStatus).catch(() => {});
  }, [otherUserId]);

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
    <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={thread.id}
          className="flex h-full min-h-0 flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
        >
          <HubHeader
            thread={thread}
            projects={projects}
            onViewContractTerms={onViewContractTerms}
            onProjectUpdated={onProjectUpdated}
            blockStatus={blockStatus}
            blockActionBusy={blockActionBusy}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
          />
          {/* No longer read-only once closed — see WorkerNegotiationInbox.jsx's
              matching comment. Only a real, mutual, WhatsApp-style block
              gates the composer now. */}
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
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

export default function BusinessNegotiationHub({ onFindTalent, onViewContractTerms, initialProjectId }) {
  const [threads, setThreads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // pageSize: 100 (the API's max) rather than the default 20 — a business
    // with several workers can easily have more than 20 projects combined,
    // and the default page would silently drop an individual worker's older
    // projects from their own thread's history here.
    Promise.all([listThreads(), listProjects({ role: "business", pageSize: 100 })])
      .then(([threadsData, projectsData]) => {
        if (cancelled) return;
        setThreads(threadsData);
        setProjects(projectsData);
        setSelectedThreadId((current) => {
          if (current) return current;
          const initialProject = projectsData.find((p) => p.id === initialProjectId);
          const preferred =
            (initialProject && threadsData.find((t) => t.other_user_id === initialProject.worker_id)) ??
            threadsData[0] ??
            null;
          return preferred?.id ?? null;
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your negotiations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialProjectId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (event.type === "MESSAGE_CREATED") {
        listThreads().then(setThreads).catch(() => {});
      } else if (event.type === "CANDIDATE_ACCEPTED") {
        Promise.all([listThreads(), listProjects({ role: "business", pageSize: 100 })])
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

  // One counterparty (a worker) can be behind several projects — grouped
  // client-side from the same real project list Projects/Workers already
  // use, keyed by worker_id.
  const projectsByCounterparty = useMemo(() => {
    const map = new Map();
    for (const project of projects) {
      if (!isActiveThread(project)) continue;
      if (!map.has(project.worker_id)) map.set(project.worker_id, []);
      map.get(project.worker_id).push(project);
    }
    return map;
  }, [projects]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );
  const activeGroup = activeThread ? projectsByCounterparty.get(activeThread.other_user_id) ?? [] : [];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35] dark:border-slate-700" />
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

  return (
    <section className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
      <ThreadNavigator
        threads={threads}
        groupsByCounterparty={projectsByCounterparty}
        selectedThreadId={activeThread?.id}
        onSelect={setSelectedThreadId}
      />

      {activeThread ? (
        <FocusHub
          thread={activeThread}
          projects={activeGroup}
          onViewContractTerms={onViewContractTerms}
          onProjectUpdated={(updated) =>
            setProjects((current) => current.map((project) => (project.id === updated.id ? { ...project, ...updated } : project)))
          }
        />
      ) : (
        <NoThreadSelected hasThreads={threads.length > 0} onFindTalent={onFindTalent} />
      )}
    </section>
  );
}
