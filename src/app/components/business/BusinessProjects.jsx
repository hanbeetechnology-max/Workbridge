import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  Lock,
  MessageSquare,
  Radar,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import PerkCountdown from "../shared/PerkCountdown";
import TimelineTracker from "../shared/TimelineTracker";
import ProjectCompletionHub from "../shared/ProjectCompletionHub";
import DeliverablesPanel from "../shared/DeliverablesPanel";
import DeadlineCountdown from "../shared/DeadlineCountdown";
import SuspenseFallback from "../common/SuspenseFallback";
// Both only ever render once a real action is clicked (funding a project,
// inviting/rehiring a worker) — never on initial page load — so they're
// lazy-loaded rather than bundled into BusinessProjects.jsx's own chunk.
const EscrowFundingDrawer = lazy(() => import("./EscrowFundingDrawer"));
const InviteWorkerModal = lazy(() => import("./InviteWorkerModal"));
import { getTierData } from "../../utils/gamification";
import { PROJECT_STATUS_META } from "../../utils/projectStatus";
import {
  listBusinessProjects,
  requestRelease as apiRequestRelease,
  updateProjectStatus as apiUpdateProjectStatus,
  cancelAndRefund as apiCancelAndRefund,
  createProject,
  getProjectShortlist,
  broadcastProject as apiBroadcastProject,
} from "../../lib/projectsApi";
import { listCandidatesForProject, respondToCandidate, inviteWorkerToProject } from "../../lib/candidatesApi";
import { getPublicProfile } from "../../lib/profilesApi";
import { listSubmissions, submitLink } from "../../lib/submissionsApi";
import { submitReview, updateReview, listReviewsFor } from "../../lib/reviewsApi";
import { getInitials } from "../../utils/formValidation";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../lib/socketClient";
import { ApiError } from "../../lib/apiClient";
import { motion, AnimatePresence } from "motion/react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import DisputeEvidenceUpload from "../shared/DisputeEvidenceUpload";
import DisputeStatusCard from "../shared/DisputeStatusCard";

const HEADING_FONT = { fontFamily: "'Lexend', sans-serif" };
const DATA_FONT = { fontFamily: "'Inter', sans-serif" };

// Maps PROJECT_STATUS_META's `tone` to a real badge color — replaces the old
// hardcoded red-vs-blue logic that only ever knew about the fake local
// "frozen" state, not real statuses like DISPUTED/CANCELLED.
const STATUS_TONE_CLASSES = {
  slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-400",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400",
  amber: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400",
  red: "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400",
};

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Worker detail side-drawer ───────────────────────────────────────────────
// Fetches the real public profile (GET /api/profiles/:id — the one
// unauthenticated route) on open, rather than showing mock skills/trust-score
// data schema.sql has no columns for.
function WorkerDetailDrawer({ project, onClose, onOpenChat }) {
  const isOpen = Boolean(project);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getPublicProfile(project.worker_id)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Couldn't load this worker's profile.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, project?.worker_id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Rendered via a portal straight onto document.body — nesting this inside
  // the tab's own root div (which carries .wb-tab-enter) would make it a
  // descendant of an element that permanently holds a (no-op) CSS transform
  // once its entrance animation finishes (animation-fill-mode: both keeps
  // the `to` keyframe's `transform: translateY(0)` applied forever). Any
  // non-`none` transform on an ancestor turns it into the containing block
  // for `position: fixed` children, so this modal would center itself
  // against that tall scrollable div instead of the actual viewport —
  // exactly the "renders in the middle of the whole page, not the screen"
  // bug. Portaling to document.body sidesteps that entirely.
  return createPortal(
    <AnimatePresence>
      {isOpen && project && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
          >
            <div className="relative flex-shrink-0">
              <div className="relative h-28 overflow-hidden bg-[#0F172A]">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#1B3FAB] opacity-25 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 left-12 w-24 h-24 bg-purple-600 opacity-15 rounded-full blur-2xl" />
                <button
                  onClick={onClose}
                  aria-label="Close worker details"
                  className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6">
                <div className="flex items-end justify-between -mt-10">
                  <div className="relative z-10 flex-shrink-0">
                    <Avatar initials={getInitials(project.worker_name)} avatarUrl={project.worker_avatar_url} bg="bg-[#1B3FAB]" size="w-20 h-20" text="text-xl" />
                    {profile?.verified && (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                        <ShieldCheck className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-xl font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                    {project.worker_name}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" style={DATA_FONT}>
                    {profile?.title ?? "Worker"}
                  </p>
                  {profile?.rating != null && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-[#0F172A] dark:text-white" style={DATA_FONT}>
                        {profile.rating}
                      </span>
                      <span className="text-sm text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                        ({profile.reviews_count} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="wb-scroll-clean flex-1 overflow-y-auto">
              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading profile…
                </div>
              )}

              {loadError && !isLoading && (
                <div className="m-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400" style={DATA_FONT}>
                  {loadError}
                </div>
              )}

              {!isLoading && !loadError && (
                <div className="p-6 space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500" style={HEADING_FONT}>
                      Project Progress
                    </p>
                    <p className="mb-3 truncate text-sm font-bold text-[#0F172A] dark:text-white" style={DATA_FONT}>
                      {project.title}
                    </p>
                    <div className="-mx-5 mb-3">
                      <TimelineTracker status={project.status} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                      Due: {formatDate(project.deadline)}
                    </span>
                    <div className="mt-2">
                      <DeadlineCountdown deadline={project.deadline} status={project.status} />
                    </div>
                  </div>

                  {/* Read-only here — this is a quick worker-glance popup, not
                      the place to actually share files. The real submission
                      flow lives in Negotiations (see the "Open Chat" CTA
                      below), so only the existing deliverables list shows. */}
                  <DeliverablesPanel projectId={project.id} readOnly downloadable />
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              {/* Chat lives in Negotiations now — permanent, split-screen,
                  never deletes history — rather than this drawer's own
                  embedded, disposable ChatThread. Matches
                  WorkerWorkspace.jsx's "Open Chat in Negotiations" button.
                  The single primary CTA — closing is already covered by the
                  X button, backdrop click, and Escape, so a second "Close"
                  button here was just redundant chrome. */}
              <button
                onClick={() => {
                  onOpenChat?.(project.id);
                  onClose?.();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B35] py-3 text-sm font-bold text-white transition-all hover:bg-[#e55a2b]"
              >
                <MessageSquare className="h-4 w-4" />
                Open Chat in Chats
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Payment approval modal ──────────────────────────────────────────────────
function PaymentApprovalModal({ project, isSubmitting, submitError, onClose, onConfirm }) {
  // Portaled to document.body for the same reason as WorkerDetailDrawer
  // above — nested inside .wb-tab-enter's permanently-transformed root div,
  // `fixed` would anchor to that div instead of the real viewport.
  return createPortal(
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={isSubmitting ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95"
          >
            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-500/10">
                  <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                    Request Release of Secured Funds
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                    {project.title}
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={onClose}
                    aria-label="Cancel"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mb-4 space-y-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 p-4 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Worker</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">{project.worker_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Amount</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">{formatINR(project.budget)}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Processing</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">WorkBridge Review</span>
                </div>
              </div>

              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3.5 dark:border-blue-900/40 dark:bg-blue-500/10">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400" style={DATA_FONT}>
                  This tells WorkBridge to pay {project.worker_name} out of the funds you already
                  secured — our team completes the transfer shortly after you confirm.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                >
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all active:scale-[0.98] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Request Release"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Request revision modal ──────────────────────────────────────────────────
// Sends a FILES_SUBMITTED project back to WORK_IN_PROGRESS instead of a full
// approve/dispute — the middle ground for "90% there, just needs a tweak".
function RequestRevisionModal({ project, note, onNoteChange, isSubmitting, submitError, onClose, onConfirm }) {
  // Portaled to document.body — see WorkerDetailDrawer's comment above for why.
  return createPortal(
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={isSubmitting ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95"
          >
            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-500/10">
                  <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                    Request Revision
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                    {project.title}
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={onClose}
                    aria-label="Cancel"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="mb-3 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300" style={DATA_FONT}>
                This sends the project back to <span className="font-semibold text-slate-900 dark:text-white">In Progress</span> so{" "}
                {project.worker_name} can upload a new file. Let them know what to fix.
              </p>

              <textarea
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                disabled={isSubmitting}
                rows={3}
                maxLength={1000}
                placeholder="e.g. Could you make the logo blue and resend? (optional)"
                className="mb-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
              />

              {submitError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                >
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all active:scale-[0.98] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition-all active:scale-[0.98] hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-600/60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Back for Revision"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Raise dispute confirm modal ──────────────────────────────────────────────
function DisputeConfirmModal({ project, reason, onReasonChange, evidence, onEvidenceChange, isSubmitting, submitError, onClose, onConfirm }) {
  // Portaled to document.body — see WorkerDetailDrawer's comment above for why.
  return createPortal(
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={isSubmitting ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95"
          >
            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 dark:border-red-900/40 dark:bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                    Raise a Dispute
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                    {project.title}
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={onClose}
                    aria-label="Cancel"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="mb-4 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300" style={DATA_FONT}>
                This pauses the project and hands it to WorkBridge for review — funds stay held until
                an admin resolves the dispute. Use this only when a revision request isn't enough.
              </p>

              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                What's the issue?
              </label>
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. Delivered work doesn't match the agreed brief and the worker hasn't responded to two revision requests."
                disabled={isSubmitting}
                className="mb-3 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />

              <div className="mb-5">
                <DisputeEvidenceUpload items={evidence} onChange={onEvidenceChange} disabled={isSubmitting} />
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                >
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all active:scale-[0.98] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting || !reason.trim()}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all active:scale-[0.98] hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-600/60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Raising…
                    </>
                  ) : (
                    "Raise Dispute"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function CancelRefundConfirmModal({ project, isSubmitting, submitError, onClose, onConfirm }) {
  return createPortal(
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={isSubmitting ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95"
          >
            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 dark:border-red-900/40 dark:bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                    Cancel &amp; Refund
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500" style={DATA_FONT}>
                    {project.title}
                  </p>
                </div>
                {!isSubmitting && (
                  <button
                    onClick={onClose}
                    aria-label="Cancel"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mb-4 space-y-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 p-4 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Worker</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">{project.worker_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Refund Amount</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">{formatINR(project.budget)}</span>
                </div>
              </div>

              <p className="mb-5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300" style={DATA_FONT}>
                {project.worker_name} never delivered by the deadline — this cancels the project and
                refunds the full amount back to you immediately. This can't be undone; if the worker
                actually did submit work, use Raise Dispute instead so WorkBridge can review it.
              </p>

              {submitError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                >
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all active:scale-[0.98] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Nevermind
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all active:scale-[0.98] hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-600/60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refunding…
                    </>
                  ) : (
                    "Cancel & Refund Now"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Open Job Board — applicants + invites review ────────────────────────────
// Every candidacy (source=APPLICATION or INVITE) against one of the
// business's own OPEN posts — accepting one assigns the project for real
// (OPEN -> ACCEPTED) and closes every sibling candidacy automatically on
// the backend (see job_candidates.controller.js's respondToCandidate).
// MASTER_ECONOMY_PLAN.md Part 3 — the Two-Door Reveal. 'hidden' means a
// worker hasn't reached Door A (first completed job) or Door B (5
// rejections) yet — new profiles stay completely clean, judged only on
// skills/questionnaire answers, exactly as intended. Tier colors only
// matter once standing_door === 'win'.
const TIER_CARD_STYLES = {
  slate: "border-slate-200 dark:border-slate-700",
  gray: "border-slate-300 dark:border-slate-600 shadow-[0_0_15px_rgba(148,163,184,0.25)]",
  yellow: "border-amber-300 dark:border-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
  teal: "border-teal-300 dark:border-teal-700 shadow-[0_0_15px_rgba(20,184,166,0.25)]",
  blue: "border-[#FF6B35] shadow-[0_0_15px_rgba(255,107,53,0.25)]",
};

function StandingBadge({ standingDoor, currentLevel }) {
  if (standingDoor === "span") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
        <Sparkles className="h-2.5 w-2.5" />
        Rising — On the Bridge
      </span>
    );
  }
  if (standingDoor === "win") {
    const { tier } = getTierData(currentLevel);
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3EC] dark:bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-[#FF6B35] dark:text-orange-400">
        <Award className="h-2.5 w-2.5" />
        {tier}
      </span>
    );
  }
  return null;
}

// Real effects of the "AI Shortlist" / "Enterprise Broadcast" perks — both
// gated server-side on an active purchase targeting THIS project (see
// perkTargets.js), so these buttons are just a convenience entry point,
// not the actual security boundary. Only shown for an OPEN post, since
// both perks only make sense before the job is filled.
function AIToolsPanel({ project }) {
  const [shortlist, setShortlist] = useState(null);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistError, setShortlistError] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastCount, setBroadcastCount] = useState(null);

  useEffect(() => {
    setShortlist(null);
    setShortlistError("");
    setBroadcastCount(null);
  }, [project?.id]);

  if (!project || project.status !== "OPEN") return null;

  const handleGetShortlist = async () => {
    setShortlistLoading(true);
    setShortlistError("");
    try {
      const data = await getProjectShortlist(project.id);
      setShortlist(data);
    } catch (err) {
      setShortlistError(err instanceof ApiError ? err.message : "Could not load the shortlist.");
    } finally {
      setShortlistLoading(false);
    }
  };

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const result = await apiBroadcastProject(project.id);
      setBroadcastCount(result.notified);
      toast.success(`Broadcast sent to ${result.notified} top-rated workers.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send the broadcast.");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGetShortlist}
          disabled={shortlistLoading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {shortlistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Get AI Shortlist
        </button>
        <button
          onClick={handleBroadcast}
          disabled={broadcasting || broadcastCount != null}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {broadcasting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
          {broadcastCount != null ? `Broadcast Sent (${broadcastCount})` : "Broadcast to Top Workers"}
        </button>
      </div>

      {shortlistError && <p className="text-xs font-semibold text-red-500 dark:text-red-400">{shortlistError}</p>}

      {shortlist && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {shortlist.length === 0 ? "No matching workers found yet" : "Suggested Workers"}
          </p>
          {shortlist.map((w) => (
            <div key={w.id} className="flex items-center gap-2.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-2">
              {w.avatar_url ? (
                <img src={w.avatar_url} alt={w.name} className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <Avatar initials={getInitials(w.name)} bg="bg-[#1B3FAB]" size="w-8 h-8" text="text-[10px]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{w.name}</p>
                {w.title && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{w.title}</p>}
              </div>
              {w.matchScore > 0 && (
                <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {w.matchScore} skill match{w.matchScore === 1 ? "" : "es"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicantsModal({ project, candidates, isLoading, respondingId, onClose, onRespond }) {
  return createPortal(
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Applicants &amp; Invites</p>
                <h3 className="truncate text-base font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                  {project.title}
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="wb-scroll-clean min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
              <AIToolsPanel project={project} />
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No applicants or invites yet — this post is still live on the Job Feed.
                </p>
              ) : (
                candidates.map((c) => {
                  const tierStyle =
                    c.standing_door === "win" ? TIER_CARD_STYLES[getTierData(c.current_level).colorTheme] : "border-slate-200 dark:border-slate-700";
                  return (
                  <div key={c.id} className={`rounded-xl border bg-slate-50 dark:bg-slate-800 p-4 ${tierStyle}`}>
                    <div className="flex items-start gap-3">
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.worker_name} className="h-10 w-10 flex-shrink-0 rounded-xl object-cover" />
                      ) : (
                        <Avatar initials={getInitials(c.worker_name)} bg="bg-[#1B3FAB]" size="w-10 h-10" text="text-xs" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-bold text-[#0F172A] dark:text-white">{c.worker_name}</p>
                          <StandingBadge standingDoor={c.standing_door} currentLevel={c.current_level} />
                          {c.gold_highlight_expires_at && (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">
                                <Award className="h-3 w-3" />
                                Highlighted
                              </span>
                              <PerkCountdown expiresAt={c.gold_highlight_expires_at} />
                            </>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              c.source === "INVITE" ? "bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 text-[#1B3FAB] dark:text-blue-400" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {c.source === "INVITE" ? "You invited" : "Applied"}
                          </span>
                          {c.status !== "PENDING" && (
                            <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {c.status}
                            </span>
                          )}
                        </div>
                        {c.worker_title && <p className="text-xs text-slate-500 dark:text-slate-400">{c.worker_title}</p>}
                        {c.rating != null && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {c.rating} ({c.reviews_count ?? 0})
                          </div>
                        )}
                        {c.message && <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">"{c.message}"</p>}
                      </div>
                      {c.status === "PENDING" && (
                        <div className="flex flex-shrink-0 flex-col gap-1.5">
                          <button
                            onClick={() => onRespond(c.id, true)}
                            disabled={respondingId === c.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#1B3FAB] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#15338d] disabled:opacity-60 dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
                          >
                            {respondingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Accept
                          </button>
                          <button
                            onClick={() => onRespond(c.id, false)}
                            disabled={respondingId === c.id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Rating + Rehire modal (History rows) ────────────────────────────────────
function RatingModal({ project, currentUserId, onClose, onRated }) {
  const [existingReview, setExistingReview] = useState(undefined);

  useEffect(() => {
    if (!project) return;
    setExistingReview(undefined);
    listReviewsFor(project.worker_id)
      .then((reviews) => {
        const mine = reviews.find((r) => r.project_id === project.id && r.reviewer_id === currentUserId);
        setExistingReview(mine ?? null);
      })
      .catch(() => setExistingReview(null));
  }, [project, currentUserId]);

  if (!project) return null;

  // The Business always sees the amount they funded, never the Worker's
  // fee-reduced net — that split only exists on the Worker's own side of
  // the ledger.
  const paidAmount = Number(project.budget);

  // Portaled to document.body — see WorkerDetailDrawer's comment above for why.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="wb-scroll-clean relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
        {existingReview === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300 dark:text-slate-600" />
          </div>
        ) : (
          <ProjectCompletionHub
            perspective="business"
            counterpartName={project.worker_name}
            amount={paidAmount}
            review={existingReview}
            onSubmit={async (rating, feedback) => {
              const saved = existingReview
                ? await updateReview({ projectId: project.id, rating, feedback })
                : await submitReview({ projectId: project.id, rating, feedback });
              setExistingReview(saved);
              onRated?.(project.id, saved.rating);
              return saved;
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function BusinessProjects({ onOpenChat }) {
  useDocumentTitle("Active Projects — WorkBridge Business");
  const { currentUser } = useAuth();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [revisionProject, setRevisionProject] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [submittingRevisionId, setSubmittingRevisionId] = useState(null);
  const [revisionError, setRevisionError] = useState(null);
  const [disputeProject, setDisputeProject] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState([]);
  const [submittingDisputeId, setSubmittingDisputeId] = useState(null);
  const [disputeError, setDisputeError] = useState(null);
  const [refundProject, setRefundProject] = useState(null);
  const [submittingRefundId, setSubmittingRefundId] = useState(null);
  const [refundError, setRefundError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [paymentProject, setPaymentProject] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [completeError, setCompleteError] = useState(null);
  const [workerDrawerProject, setWorkerDrawerProject] = useState(null);
  // Same real, per-device declutter pattern as WorkerWorkspace.jsx's
  // dismissedHistoryIds — a completed/cancelled project stays a real,
  // permanent DB record (payment history, dispute record) either way;
  // this only hides it from THIS device's own History list once it's no
  // longer useful to see there.
  const [dismissedHistoryIds, setDismissedHistoryIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("wb_dismissed_business_history") ?? "[]"));
    } catch {
      return new Set();
    }
  });
  const dismissHistoryProject = (id) => {
    setDismissedHistoryIds((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem("wb_dismissed_business_history", JSON.stringify([...next]));
      return next;
    });
  };
  // Opens EscrowFundingDrawer for this project — replaces the old instant,
  // no-proof-required apiSecureFunds() click (see fundEscrow in
  // projects.controller.js for why that changed).
  const [fundingProject, setFundingProject] = useState(null);
  const [ratingProject, setRatingProject] = useState(null);
  // The project a "Rehire" click was fired from — opens the same real
  // "assign to an existing open post, or draft a new one" modal Find
  // Workers uses, instead of silently fabricating a placeholder project.
  const [rehireProject, setRehireProject] = useState(null);
  const [rehireSubmitting, setRehireSubmitting] = useState(false);
  const [rehireError, setRehireError] = useState("");
  // projectId -> rating, so a History row can show the stars you already gave
  // without having to reopen the modal every time.
  const [ratingsByProject, setRatingsByProject] = useState({});
  const [applicantsProject, setApplicantsProject] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [respondingCandidateId, setRespondingCandidateId] = useState(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [projectsTab, setProjectsTab] = useState("ongoing");

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listBusinessProjects();
      setProjects(data);
    } catch (err) {
      setLoadError(err.message || "Couldn't load projects — is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openApplicants = (project) => {
    setApplicantsProject(project);
    setApplicantsLoading(true);
    listCandidatesForProject(project.id)
      .then(setApplicants)
      .catch(() => setApplicants([]))
      .finally(() => setApplicantsLoading(false));
  };

  const handleRespondToCandidate = async (candidateId, accept) => {
    setRespondingCandidateId(candidateId);
    try {
      await respondToCandidate(candidateId, accept);
      toast.success(accept ? "Candidate accepted — project is now underway." : "Application declined.");
      if (accept) {
        setApplicantsProject(null);
        loadProjects();
      } else if (applicantsProject) {
        listCandidatesForProject(applicantsProject.id).then(setApplicants).catch(() => {});
      }
    } catch (err) {
      toast.error(err.message || "Could not respond to this candidate.");
    } finally {
      setRespondingCandidateId(null);
    }
  };

  const handleWithdrawPost = async (id) => {
    setWithdrawingId(id);
    try {
      const updated = await apiUpdateProjectStatus(id, "CANCELLED");
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setConfirmWithdrawId(null);
    } catch (err) {
      toast.error(err.message || "Could not withdraw this post.");
    } finally {
      setWithdrawingId(null);
    }
  };

  // CANCELLED used to only be excluded from history (still counted as
  // "live" here), so a declined/cancelled project sat in Active Projects
  // forever showing action buttons (Raise Dispute, Download Files) that no
  // longer make sense once it's actually done.
  const liveProjects = projects.filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED");
  const historyProjects = projects
    .filter((p) => p.status === "COMPLETED" || p.status === "CANCELLED")
    .filter((p) => !dismissedHistoryIds.has(p.id));
  // Posted (OPEN, no worker yet) and Ongoing (assigned, actually underway)
  // used to render mixed together in one list — split into their own tabs,
  // same pill-switcher pattern as WorkerWorkspace's Active Tasks/History.
  const postedProjects = liveProjects.filter((p) => p.status === "OPEN");
  const ongoingProjects = liveProjects.filter((p) => p.status !== "OPEN");

  // Kept in a ref (not read from `projects` directly) so the socket
  // subscription below — mounted once — never closes over a stale list.
  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Live nudge for state changes the worker/admin side makes while this tab
  // is open — this component previously had zero realtime wiring, so a
  // worker starting/submitting work or an admin reviewing a deliverable
  // never showed up here without a manual refresh. FUNDS_SECURED/COMPLETED
  // are this business's own actions (already reflected via the direct REST
  // response in handleSecureFunds/handleConfirmPayment) — patched silently
  // here too, only for the rare second-open-tab case, no duplicate toast.
  // See backend/src/realtime/events.js for the emit side.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      const project = projectsRef.current.find((p) => p.id === event.projectId);
      if (!project) return;

      switch (event.type) {
        case "FUNDS_SECURED":
          setProjects((prev) => prev.map((p) => (p.id === event.projectId ? { ...p, status: "FUNDS_SECURED" } : p)));
          break;
        case "COMPLETED":
          setProjects((prev) => prev.map((p) => (p.id === event.projectId ? { ...p, status: "COMPLETED" } : p)));
          // The actual COMPLETED transition (and the real Corporate Credits
          // + XP it awards — completeProject in projects.controller.js) only
          // runs once WorkBridge staff process the release, asynchronously
          // after this business's own "Approve & Release" click — so this
          // socket event, not that earlier click, is the only place this
          // business ever finds out it happened. Previously silent.
          if (event.businessTokenDelta > 0 || event.businessXpDelta > 0) {
            toast.success(
              `"${project.title}" is complete — +${event.businessTokenDelta} Corporate Credits, +${event.businessXpDelta} XP earned.`
            );
          }
          break;
        case "STATUS_CHANGED":
          setProjects((prev) => prev.map((p) => (p.id === event.projectId ? { ...p, status: event.status } : p)));
          if (event.actorRole !== "business") {
            toast.info(`${project.worker_name} updated "${project.title}" to ${event.status.replaceAll("_", " ").toLowerCase()}.`);
          }
          break;
        case "SUBMISSION_CREATED":
          if (event.submittedBy !== currentUser?.id) {
            toast.info(`${project.worker_name} submitted new work on "${project.title}" — pending review.`);
          }
          break;
        case "SUBMISSION_REVIEWED":
          toast.info(`A submission on "${project.title}" was ${event.status.toLowerCase()} by WorkBridge.`);
          break;
        case "REVIEW_SUBMITTED":
          if (event.revieweeId === currentUser?.id) {
            toast.success(`${project.worker_name} left you a ${event.rating}★ review on "${project.title}".`);
          }
          break;
        default:
          break;
      }
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
  }, [currentUser?.id]);

  // Populate ratingsByProject once history projects are known — one
  // listReviewsFor call per unique worker (not per project), matched back to
  // the project the review was actually left on.
  useEffect(() => {
    if (historyProjects.length === 0 || !currentUser?.id) return;
    let cancelled = false;
    const workerIds = [...new Set(historyProjects.map((p) => p.worker_id).filter(Boolean))];
    Promise.all(workerIds.map((workerId) => listReviewsFor(workerId).catch(() => [])))
      .then((results) => {
        if (cancelled) return;
        const map = {};
        results.flat().forEach((review) => {
          if (review.reviewer_id === currentUser.id) map[review.project_id] = review.rating;
        });
        setRatingsByProject(map);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, currentUser?.id]);

  const handleConfirmRevision = async () => {
    if (!revisionProject || submittingRevisionId) return;
    const id = revisionProject.id;
    setSubmittingRevisionId(id);
    setRevisionError(null);
    try {
      const updated = await apiUpdateProjectStatus(id, "WORK_IN_PROGRESS", revisionNote.trim());
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setRevisionProject(null);
      setRevisionNote("");
    } catch (err) {
      setRevisionError(err.message || "Couldn't request a revision — try again.");
    } finally {
      setSubmittingRevisionId(null);
    }
  };

  const handleConfirmDispute = async () => {
    if (!disputeProject || submittingDisputeId || !disputeReason.trim()) return;
    const id = disputeProject.id;
    setSubmittingDisputeId(id);
    setDisputeError(null);
    try {
      const updated = await apiUpdateProjectStatus(id, "DISPUTED", disputeReason.trim(), disputeEvidence);
      // Merge, don't replace — updateProjectStatus returns a bare `RETURNING *`
      // row (see projects.repository.js's raiseDispute), missing the
      // worker_name/business_name/avatar fields only the joined list query
      // provides. A plain replace here wiped those, breaking DisputeStatusCard's
      // "who raised this" attribution and the card's own name/avatar.
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setDisputeProject(null);
      setDisputeReason("");
      setDisputeEvidence([]);
    } catch (err) {
      setDisputeError(err.message || "Couldn't raise a dispute — try again.");
    } finally {
      setSubmittingDisputeId(null);
    }
  };

  const handleConfirmRefund = async () => {
    if (!refundProject || submittingRefundId) return;
    const id = refundProject.id;
    setSubmittingRefundId(id);
    setRefundError(null);
    try {
      const updated = await apiCancelAndRefund(id);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated.project : p)));
      setRefundProject(null);
      toast.success(`${formatINR(refundProject.budget)} refunded — the project has been cancelled.`);
    } catch (err) {
      setRefundError(err.message || "Couldn't cancel & refund this project — try again.");
    } finally {
      setSubmittingRefundId(null);
    }
  };

  // Defensive: setCompletingId is set synchronously before the API call, and
  // the button below is disabled the instant that's true — a rapid
  // double-click can't fire this twice. try/catch/finally guarantees the
  // loading state always clears, success or failure, so the button never
  // gets stuck.
  const handleConfirmPayment = async () => {
    if (!paymentProject || completingId) return;
    const id = paymentProject.id;
    setCompletingId(id);
    setCompleteError(null);
    try {
      const updated = await apiRequestRelease(id);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setPaymentProject(null);
      toast.success("Release requested — WorkBridge will pay the worker out of Secured Funds shortly.");
    } catch (err) {
      const message = err.message || "Release request failed — the project may not be in Files Submitted status yet.";
      setCompleteError(message);
      toast.error(message);
    } finally {
      setCompletingId(null);
    }
  };

  // The old "Download Files" button just opened the worker-detail drawer
  // (same as "View Worker") — clicking it never actually downloaded
  // anything. This fetches the project's real approved deliverables and
  // forces a real download/open per submission: a link opens in a new tab,
  // an inline image is forced through a temporary <a download> element so
  // the browser treats it as a file save rather than just navigating to it.
  const handleDownloadFiles = async (project) => {
    if (downloadingId) return;
    setDownloadingId(project.id);
    try {
      const submissions = await listSubmissions(project.id);
      const approved = submissions.filter((s) => s.status === "APPROVED");
      if (approved.length === 0) {
        toast.info("No deliverables yet — check back once the worker submits.");
        return;
      }

      let hasLinks = false;
      approved.forEach((submission, index) => {
        if (submission.type === "link") {
          hasLinks = true;
          return;
        }
        // A real download only for images — a synchronous-looking anchor
        // click still works reliably here even after the await above.
        const anchor = document.createElement("a");
        anchor.href = submission.image_data;
        anchor.download = `${project.title}-deliverable-${index + 1}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      });

      if (hasLinks) {
        // window.open() called after an `await` is silently blocked by the
        // popup blocker in most browsers — it's no longer treated as a
        // direct result of the click that triggered this handler. That's
        // exactly why "Download Files" could look like it did nothing:
        // nothing was actually broken server-side, the new tab just never
        // opened. Real <a href target="_blank"> clicks inside the worker
        // drawer don't have this problem, so route link submissions there
        // instead of trying to window.open() them from here.
        setWorkerDrawerProject(project);
      }
    } catch (err) {
      toast.error(err.message || "Could not load this project's deliverables.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Rehiring drafted a brand-new project with a fabricated placeholder
  // title/description and silently reused the old budget — no real details,
  // and no way to instead assign the worker to a job you'd already posted.
  // Now opens the same real InviteWorkerModal Find Workers uses: pick one of
  // your own OPEN posts, or draft a real new one with a real title/budget.
  const openJobsForRehire = projects.filter((p) => p.status === "OPEN");

  const submitRehireNewProject = async (jobDetails) => {
    if (!rehireProject) return;
    setRehireSubmitting(true);
    setRehireError("");
    try {
      const created = await createProject({
        workerId: rehireProject.worker_id,
        title: jobDetails.title,
        description: jobDetails.description,
        budget: Number(jobDetails.budget),
        deadline: jobDetails.deadline || undefined,
      });
      const referenceLinks = (jobDetails.referenceLinks ?? []).filter(Boolean);
      if (referenceLinks.length > 0) {
        await Promise.allSettled(
          referenceLinks.map((url) =>
            submitLink({ projectId: created.id, url, caption: "Reference material shared at invite time" })
          )
        );
      }
      toast.success(`Invitation sent to ${rehireProject.worker_name || "the Worker"} for a new task.`);
      setRehireProject(null);
      loadProjects();
    } catch (err) {
      setRehireError(err instanceof ApiError ? err.message : "Could not send the rehire invite.");
    } finally {
      setRehireSubmitting(false);
    }
  };

  const submitRehireExistingProject = async (projectId, message) => {
    if (!rehireProject) return;
    setRehireSubmitting(true);
    setRehireError("");
    try {
      await inviteWorkerToProject(projectId, rehireProject.worker_id, message.trim() || undefined);
      toast.success(`Invite sent to ${rehireProject.worker_name || "the Worker"}.`);
      setRehireProject(null);
      loadProjects();
    } catch (err) {
      setRehireError(err instanceof ApiError ? err.message : "Could not send the rehire invite.");
    } finally {
      setRehireSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 p-4 sm:p-7 wb-tab-enter dark:bg-slate-950" style={DATA_FONT}>
      <div className="w-full">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
            Active Projects
          </h1>
          <button
            onClick={loadProjects}
            disabled={isLoading}
            aria-label="Refresh projects"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:text-slate-400 transition-all active:scale-[0.98] hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Secondary, non-text-heavy trust panel — the one deliberately
            translucent glass surface on this page; financial data below
            stays on solid/near-solid backgrounds for readability. */}
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-slate-600 dark:text-slate-400 shadow-sm backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/40">
          <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-semibold">Every payment release goes through WorkBridge in one clean step — nothing is ever left half-transferred.</p>
        </div>

        {loadError && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{loadError}</p>
            <button
              onClick={loadProjects}
              className="flex-shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm hover:bg-red-50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Retry
            </button>
          </div>
        )}


        {!isLoading && !loadError && (
          <div className="mb-6 flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
            {[
              { id: "ongoing", label: "Ongoing", count: ongoingProjects.length, icon: RefreshCw },
              { id: "posted", label: "Posted", count: postedProjects.length, icon: Briefcase },
              { id: "history", label: "History", count: historyProjects.length, icon: CheckCircle2 },
            ].map(({ id, label, count, icon: Icon }) => {
              const active = projectsTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setProjectsTab(id)}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    active ? "bg-white text-[#0F172A] dark:text-white shadow-sm dark:bg-slate-700" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-[#1B3FAB] text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isLoading && (
          <div className="space-y-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90" />
            ))}
          </div>
        )}

        {!isLoading && !loadError && projectsTab === "posted" && (
          <motion.div
            key="posted"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="space-y-5"
          >
            <AnimatePresence>
              {postedProjects.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="overflow-hidden rounded-2xl border border-[#1B3FAB]/20 bg-white/90 dark:bg-slate-900/90 p-4 backdrop-blur-sm sm:p-5 dark:border-[#1B3FAB]/30"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 text-[11px] font-bold text-[#1B3FAB] dark:text-blue-400">
                        <Briefcase className="h-3 w-3" />
                        Live on Job Feed
                      </span>
                      <h3 className="mt-2 truncate text-[15px] font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                        {p.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">No worker assigned yet — anyone can apply, or invite someone directly.</p>
                    </div>
                    <div className="flex-shrink-0 sm:text-right">
                      <div className="text-lg font-extrabold text-[#1B3FAB] dark:text-blue-400">{formatINR(p.budget)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => openApplicants(p)}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#1B3FAB] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1635A0] dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:shadow-none dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
                    >
                      <Users className="h-3.5 w-3.5" />
                      View Applicants
                    </button>
                    {confirmWithdrawId === p.id ? (
                      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                        Withdraw this post?
                        <button
                          onClick={() => handleWithdrawPost(p.id)}
                          disabled={withdrawingId === p.id}
                          className="rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {withdrawingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmWithdrawId(null)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmWithdrawId(p.id)}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                        Withdraw Post
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {postedProjects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90 p-10 text-center text-sm text-slate-400 dark:text-slate-500">
                No open posts right now — click "Post a Job" to put one live on the Job Feed.
              </div>
            )}
          </motion.div>
        )}

        {!isLoading && !loadError && projectsTab === "ongoing" && (
          <motion.div
            key="ongoing"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="space-y-5"
          >
            <AnimatePresence>
              {ongoingProjects.map((p, i) => {
                const isDisputed = p.status === "DISPUTED";
                const meta = p.status ? PROJECT_STATUS_META[p.status] : null;
                const badgeTone = STATUS_TONE_CLASSES[meta?.tone] ?? STATUS_TONE_CLASSES.blue;
                const canRelease = p.status === "FILES_SUBMITTED";
                const canRequestRevision = p.status === "FILES_SUBMITTED";
                const canDispute = !["DISPUTED", "CANCELLED", "COMPLETED"].includes(p.status);
                // The Ghosting Failsafe — only once the real hard deadline
                // has passed with the worker still stuck pre-delivery
                // (never reached FILES_SUBMITTED). Matches cancelAndRefund's
                // own server-side check exactly, so this button only ever
                // shows when the click will actually succeed.
                const isGhosted =
                  ["FUNDS_SECURED", "WORK_IN_PROGRESS"].includes(p.status) &&
                  p.deadline &&
                  new Date(p.deadline).getTime() < Date.now();
                const isCompletingThis = completingId === p.id;

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className={`overflow-hidden rounded-2xl border bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-shadow duration-200 ${
                      isDisputed ? "border-red-200 dark:border-red-900/40 shadow-sm shadow-red-100/60 dark:shadow-none" : "border-slate-200 dark:border-slate-800 hover:shadow-md"
                    }`}
                  >
                    {isDisputed && (
                      <div className="border-b border-red-100 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/10">
                        <DisputeStatusCard
                          project={p}
                          currentUserId={currentUser?.id}
                          onUpdated={(updated) => setProjects((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)))}
                        />
                      </div>
                    )}

                    <div className="p-4 sm:p-5">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar initials={getInitials(p.worker_name)} avatarUrl={p.worker_avatar_url} bg="bg-[#1B3FAB]" size="w-12 h-12" text="text-xs" />
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-extrabold text-[#0F172A] dark:text-white" style={HEADING_FONT}>
                              {p.title}
                            </h3>
                            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                              with {p.worker_name} · Due {formatDate(p.deadline)}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0 sm:ml-4 sm:text-right">
                          <div className="text-lg font-extrabold text-[#1B3FAB] dark:text-blue-400">{formatINR(p.budget)}</div>
                          <div className="mt-0.5 font-mono text-xs text-slate-400 dark:text-slate-500">Secured: {formatINR(p.budget)}</div>
                        </div>
                      </div>

                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex-1">
                          <TimelineTracker status={p.status} />
                        </div>
                        <span
                          role="status"
                          aria-live="polite"
                          aria-label={`Project status: ${meta?.label ?? "Pending"}`}
                          className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${badgeTone}`}
                        >
                          {meta?.label ?? "Pending"}
                        </span>
                      </div>

                      {/* Action buttons — kept visually separate from the ledger/
                          status above so a rupee figure never reads as clickable */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => setWorkerDrawerProject(p)}
                          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#1B3FAB]/15 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-4 py-2 text-xs font-semibold text-[#1B3FAB] dark:text-blue-400 transition-colors hover:bg-[#1B3FAB]/10"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          View Worker
                        </button>

                        <button
                          onClick={() => handleDownloadFiles(p)}
                          disabled={downloadingId === p.id}
                          className={`relative flex min-h-[44px] items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            p.new_deliverables_count > 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                              : "border-slate-200 bg-white text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                          }`}
                        >
                          {downloadingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : p.latest_deliverable_type === "link" ? (
                            <ExternalLink className="h-3.5 w-3.5" />
                          ) : p.latest_deliverable_type === "image" ? (
                            <Download className="h-3.5 w-3.5" />
                          ) : (
                            <FolderOpen className="h-3.5 w-3.5" />
                          )}
                          {/* Reflects the real action this button takes for the
                              newest deliverable: a link opens it, an image
                              downloads it. Falls back to the generic "View
                              Files" when there's nothing to check yet, or the
                              type isn't known — a project can have several
                              deliverables of mixed types, so this only ever
                              promises what the latest one actually is. */}
                          {downloadingId === p.id
                            ? "Working…"
                            : p.latest_deliverable_type === "link"
                              ? "Open Link"
                              : p.latest_deliverable_type === "image"
                                ? "Download Image"
                                : "View Files"}
                          {p.new_deliverables_count > 0 && (
                            <span
                              className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm"
                              aria-label={`${p.new_deliverables_count} new deliverable${p.new_deliverables_count === 1 ? "" : "s"}`}
                            >
                              {p.new_deliverables_count}
                            </span>
                          )}
                        </button>

                        {canRequestRevision && (
                          <button
                            onClick={() => {
                              setRevisionProject(p);
                              setRevisionNote("");
                              setRevisionError(null);
                            }}
                            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Request Revision
                          </button>
                        )}

                        {isGhosted && (
                          p.has_momentum_shield ? (
                            <span
                              title="This worker purchased a Momentum Shield perk — it blocks one Cancel & Refund while active."
                              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700 dark:border-teal-900/40 dark:bg-teal-950/30 dark:text-teal-400"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Protected by Momentum Shield
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setRefundProject(p);
                                setRefundError(null);
                              }}
                              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Cancel &amp; Refund — Deadline Missed
                            </button>
                          )
                        )}

                        {canDispute && (
                          <button
                            onClick={() => {
                              setDisputeProject(p);
                              setDisputeError(null);
                            }}
                            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Raise Dispute
                          </button>
                        )}

                        {p.status === "ACCEPTED" && (
                          <button
                            onClick={() => setFundingProject(p)}
                            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#1B3FAB] px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1635A0] hover:shadow-md dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:shadow-none dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0] sm:ml-auto sm:w-auto sm:justify-start"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Secure Funds
                          </button>
                        )}

                        {p.status === "PENDING_FUNDS" && (
                          // funding_method distinguishes a real-time Cashfree
                          // payment (resolves in seconds via webhook/verify,
                          // no staff action needed — "Awaiting WorkBridge
                          // Verification" was misleading here, it implies a
                          // human is manually checking something) from the
                          // manual bank-transfer fallback (genuinely does
                          // wait on staff to confirm a submitted UTR).
                          <span className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-2 text-xs font-bold text-amber-700 sm:ml-auto sm:w-auto sm:justify-start dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {p.funding_method === "RAZORPAY" ? "Processing Payment…" : "Awaiting WorkBridge Verification"}
                          </span>
                        )}

                        {/* The single primary CTA on this card — only one
                            renders at a time, always the heaviest visual
                            weight, so the "next state" is never ambiguous. */}
                        {canRelease && (
                          <button
                            onClick={() => setPaymentProject(p)}
                            disabled={isCompletingThis}
                            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto sm:w-auto sm:justify-start"
                          >
                            {isCompletingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Releasing…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve &amp; Request Release
                              </>
                            )}
                          </button>
                        )}

                        {p.status === "PENDING_RELEASE" && (
                          <span className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 sm:ml-auto dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                            <Loader2 className="h-3.5 w-3.5" />
                            Release requested — WorkBridge is processing this payout
                          </span>
                        )}

                        {p.status === "COMPLETED" && (
                          <Link
                            to={`/invoice?id=${p.id}`}
                            className="ml-auto text-xs font-bold text-[#1B3FAB] dark:text-blue-400 hover:underline"
                          >
                            View Invoice
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {ongoingProjects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90 p-10 text-center text-sm text-slate-400 dark:text-slate-500">
                No ongoing projects right now.
              </div>
            )}
          </motion.div>
        )}

        {!isLoading && !loadError && projectsTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {historyProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 dark:border-slate-700 dark:bg-slate-900/90 p-10 text-center text-sm text-slate-400 dark:text-slate-500">
                No completed or cancelled projects yet.
              </div>
            ) : (
            <div className="space-y-3">
              {historyProjects.map((p) => {
                const myRating = ratingsByProject[p.id];
                const isCancelled = p.status === "CANCELLED";
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 ${
                      isCancelled ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" : "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    }`}
                  >
                    {/* History declutter — a real, per-device hide (see
                        dismissedHistoryIds above), not a DB delete. The
                        underlying project/payment record stays exactly as
                        it was; this just removes it from this device's own
                        History list once it's no longer useful to see. */}
                    <button
                      type="button"
                      onClick={() => dismissHistoryProject(p.id)}
                      aria-label="Remove from history"
                      title="Remove from history"
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex min-w-0 items-center gap-3 pr-6">
                      <Avatar initials={getInitials(p.worker_name)} avatarUrl={p.worker_avatar_url} bg="bg-[#1B3FAB]" size="w-10 h-10" text="text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#0F172A] dark:text-white">{p.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">with {p.worker_name || "a Worker"}</p>
                      </div>
                    </div>
                    {/* Cancelled projects never had funds secured or a
                        completed deliverable — no invoice/rating/receipt
                        actions make sense here, only a status badge and the
                        option to invite the same worker again. */}
                    {isCancelled ? (
                      <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                          Cancelled
                        </span>
                        <button
                          onClick={() => setWorkerDrawerProject(p)}
                          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          <MessageSquare className="h-3 w-3" />
                          View Chat
                        </button>
                        <button
                          onClick={() => setRehireProject(p)}
                          className="flex items-center gap-1 rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-2.5 py-1 text-xs font-bold text-[#FF6B35] hover:bg-[#FF6B35]/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Rehire
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatINR(p.budget)}</span>

                        <button
                          onClick={() => setWorkerDrawerProject(p)}
                          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          <MessageSquare className="h-3 w-3" />
                          View Chat
                        </button>

                        {myRating ? (
                          <button
                            type="button"
                            onClick={() => setRatingProject(p)}
                            title={`You rated this ${myRating}/5 — click to view or edit`}
                            className="flex items-center gap-0.5 rounded-full px-1 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`h-3.5 w-3.5 ${n <= myRating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"}`}
                              />
                            ))}
                          </button>
                        ) : (
                          <button
                            onClick={() => setRatingProject(p)}
                            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                          >
                            <Star className="h-3 w-3" />
                            Rate
                          </button>
                        )}

                        <button
                          onClick={() => setRehireProject(p)}
                          className="flex items-center gap-1 rounded-full border border-[#FF6B35]/30 bg-[#FF6B35]/10 px-2.5 py-1 text-xs font-bold text-[#FF6B35] hover:bg-[#FF6B35]/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Rehire
                        </button>

                        <Link
                          to={`/invoice?id=${p.id}`}
                          className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          View Invoice
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </motion.div>
        )}
      </div>

      <WorkerDetailDrawer
        project={workerDrawerProject}
        onClose={() => setWorkerDrawerProject(null)}
        onOpenChat={onOpenChat}
      />

      {fundingProject && (
        <Suspense fallback={<SuspenseFallback fullScreen={false} />}>
          <EscrowFundingDrawer
            project={fundingProject}
            onClose={() => setFundingProject(null)}
            onFunded={(updatedProject) => {
              setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
            }}
          />
        </Suspense>
      )}

      <PaymentApprovalModal
        project={paymentProject}
        isSubmitting={completingId === paymentProject?.id}
        submitError={completeError}
        onClose={() => {
          if (completingId) return;
          setPaymentProject(null);
          setCompleteError(null);
        }}
        onConfirm={handleConfirmPayment}
      />

      <RequestRevisionModal
        project={revisionProject}
        note={revisionNote}
        onNoteChange={setRevisionNote}
        isSubmitting={submittingRevisionId === revisionProject?.id}
        submitError={revisionError}
        onClose={() => {
          if (submittingRevisionId) return;
          setRevisionProject(null);
          setRevisionError(null);
        }}
        onConfirm={handleConfirmRevision}
      />

      <DisputeConfirmModal
        project={disputeProject}
        reason={disputeReason}
        onReasonChange={setDisputeReason}
        evidence={disputeEvidence}
        onEvidenceChange={setDisputeEvidence}
        isSubmitting={submittingDisputeId === disputeProject?.id}
        submitError={disputeError}
        onClose={() => {
          if (submittingDisputeId) return;
          setDisputeProject(null);
          setDisputeError(null);
          setDisputeReason("");
          setDisputeEvidence([]);
        }}
        onConfirm={handleConfirmDispute}
      />

      <CancelRefundConfirmModal
        project={refundProject}
        isSubmitting={submittingRefundId === refundProject?.id}
        submitError={refundError}
        onClose={() => {
          if (submittingRefundId) return;
          setRefundProject(null);
          setRefundError(null);
        }}
        onConfirm={handleConfirmRefund}
      />

      <RatingModal
        project={ratingProject}
        currentUserId={currentUser?.id}
        onClose={() => setRatingProject(null)}
        onRated={(projectId, rating) => setRatingsByProject((prev) => ({ ...prev, [projectId]: rating }))}
      />

      <ApplicantsModal
        project={applicantsProject}
        candidates={applicants}
        isLoading={applicantsLoading}
        respondingId={respondingCandidateId}
        onClose={() => setApplicantsProject(null)}
        onRespond={handleRespondToCandidate}
      />

      {rehireProject && (
        <Suspense fallback={<SuspenseFallback fullScreen={false} />}>
          <InviteWorkerModal
            worker={{ id: rehireProject.worker_id, name: rehireProject.worker_name || "this Worker" }}
            openJobs={openJobsForRehire}
            title={`Rehire ${rehireProject.worker_name || "this Worker"}`}
            onClose={() => {
              setRehireProject(null);
              setRehireError("");
            }}
            onSubmitExisting={submitRehireExistingProject}
            onSubmitNew={submitRehireNewProject}
            submitting={rehireSubmitting}
            error={rehireError}
          />
        </Suspense>
      )}
    </div>
  );
}
