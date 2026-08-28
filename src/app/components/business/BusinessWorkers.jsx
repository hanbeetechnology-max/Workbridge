import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  Star,
  ShieldCheck,
  Send,
  CheckCircle2,
  X,
  AlertCircle,
  Briefcase,
  IndianRupee,
  Timer,
  Lock,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import PinnedBadgeOverlay from "../shared/PinnedBadgeOverlay";
import WorkerShareableProfile from "../worker/WorkerShareableProfile";
// Only renders once an invite is actually clicked, never on initial page
// load — lazy-loaded rather than bundled into this tab's own chunk.
const InviteWorkerModal = lazy(() => import("./InviteWorkerModal"));
import SuspenseFallback from "../common/SuspenseFallback";
import { listWorkers } from "../../lib/profilesApi";
import { listProjects, createProject } from "../../lib/projectsApi";
import { submitLink } from "../../lib/submissionsApi";
import { getPendingInvitedWorkerIds, inviteWorkerToProject } from "../../lib/candidatesApi";
import { startThreadWithWorker } from "../../lib/threadsApi";
import { getInitials } from "../../utils/formValidation";
import { ApiError } from "../../lib/apiClient";

// ── Ranking ────────────────────────────────────────────────────────────────
// Real trust signals only — behavior score, then rating. No fake match%/elite
// boost (those were per-job/subscription concepts with no real backend).
function rank(a, b) {
  const scoreA = a.behavior_score ?? -1;
  const scoreB = b.behavior_score ?? -1;
  if (scoreB !== scoreA) return scoreB - scoreA;
  return (b.rating ?? 0) - (a.rating ?? 0);
}

const scoreTone = (score) => {
  if (score == null) return "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700";
  if (score >= 700) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40";
  if (score >= 500) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40";
  return "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/40";
};

export default function BusinessWorkers({ pendingJob, onInviteSent, onViewProjects, isVerified = false, onVerify, onMessageWorker }) {
  const [workers, setWorkers] = useState([]);
  const [invitedWorkerIds, setInvitedWorkerIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null); // worker being invited via the standalone modal
  const [submitting, setSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [toast, setToast] = useState("");
  const [openJobs, setOpenJobs] = useState([]);
  const [messagingBusy, setMessagingBusy] = useState(false);
  const [messagingError, setMessagingError] = useState("");

  const handleMessageWorker = async (worker) => {
    setMessagingError("");
    setMessagingBusy(true);
    try {
      const thread = await startThreadWithWorker(worker.id);
      setSelectedWorker(null);
      onMessageWorker?.(thread.id);
    } catch (err) {
      setMessagingError(err instanceof ApiError ? err.message : "Could not start that conversation.");
    } finally {
      setMessagingBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([listWorkers(), listProjects({ role: "business" }), getPendingInvitedWorkerIds()])
      .then(([workerRows, projects, pendingInvitedIds]) => {
        if (cancelled) return;
        setWorkers(workerRows);
        // "Invited" here means "you already have something active going with
        // this worker" (the button links to onViewProjects, not a fresh
        // invite) — CANCELLED *and* COMPLETED must both be excluded, or a
        // worker who finished a job with this business months ago would
        // show as permanently "Invited" and could never be invited to a new
        // job through this button again. Assigned-project invites
        // (worker_id already set) are only half the picture, though — an
        // invite to one of this business's own still-OPEN posts never sets
        // worker_id until accepted, so without pendingInvitedIds those stay
        // invisible here and a second invite attempt would 409 with no
        // warning (see job_candidates.repository.js's
        // listPendingInvitedWorkerIdsForBusiness).
        setInvitedWorkerIds(
          new Set([
            ...projects.filter((p) => p.status !== "CANCELLED" && p.status !== "COMPLETED").map((p) => p.worker_id),
            ...pendingInvitedIds,
          ])
        );
        setOpenJobs(projects.filter((p) => p.status === "OPEN"));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load workers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedWorker) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e) => { if (e.key === "Escape") setSelectedWorker(null); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [selectedWorker]);

  const rankedWorkers = useMemo(() => [...workers].sort(rank), [workers]);

  const submitInvite = async (worker, jobDetails) => {
    setSubmitting(true);
    setInviteError("");
    try {
      const project = await createProject({
        workerId: worker.id,
        title: jobDetails.title,
        description: jobDetails.description,
        budget: Number(jobDetails.budget),
        deadline: jobDetails.deadline || undefined,
      });

      // Reference material attached at invite time (BusinessPostJob's
      // "Reference Materials" card, or InviteModal's link field below) —
      // goes through the exact same moderation queue as a worker's finished
      // work, per the existing Trust Checker rule. A failure here shouldn't
      // undo the invite that already succeeded, so these are best-effort.
      const referenceLinks = (jobDetails.referenceLinks ?? []).filter(Boolean);
      if (referenceLinks.length > 0) {
        await Promise.allSettled(
          referenceLinks.map((url) =>
            submitLink({ projectId: project.id, url, caption: "Reference material shared at invite time" })
          )
        );
      }

      setInvitedWorkerIds((prev) => new Set(prev).add(worker.id));
      setInviteTarget(null);
      if (onInviteSent) {
        onInviteSent();
      } else {
        setToast(`Invitation sent to ${worker.name}.`);
        window.setTimeout(() => setToast(""), 2600);
      }
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Could not send this invite.");
    } finally {
      setSubmitting(false);
    }
  };

  // Same global, one-time isVerified gate BusinessPostJob already enforces
  // for "Post a Job" — a business shouldn't be able to invite workers
  // through this second entry point while still unverified.
  const handleInviteClick = (worker) => {
    if (!isVerified) {
      onVerify?.();
      return;
    }
    if (pendingJob) {
      submitInvite(worker, pendingJob);
    } else {
      setInviteError("");
      setInviteTarget(worker);
    }
  };

  // The "existing project" branch of the unified invite modal — creates a
  // real job_candidates row (source=INVITE) against one of the business's
  // own OPEN posts, distinct from submitInvite above (which creates a
  // brand-new project via createProject).
  const submitExistingJobInvite = async (projectId, message) => {
    if (!inviteTarget) return;
    setSubmitting(true);
    setInviteError("");
    try {
      await inviteWorkerToProject(projectId, inviteTarget.id, message.trim() || undefined);
      setInvitedWorkerIds((prev) => new Set(prev).add(inviteTarget.id));
      setToast(`Invite sent to ${inviteTarget.name}.`);
      window.setTimeout(() => setToast(""), 2600);
      setInviteTarget(null);
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Could not send this invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-7 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-7 dark:bg-slate-950">
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 p-7 wb-tab-enter dark:bg-slate-950">
      <div className="w-full">

        <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="font-display text-2xl font-extrabold text-[#0F172A] dark:text-white"
            >
              Talent Directory
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Showing {rankedWorkers.length} verified workers</p>
          </div>
        </div>

        {pendingJob && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#1B3FAB]/20 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-5 py-3.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800">
              <Briefcase className="h-4 w-4 text-[#1B3FAB] dark:text-blue-400" />
            </div>
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-800 dark:text-slate-200">Selecting a worker for "{pendingJob.title}".</span>{" "}
              <span className="inline-flex items-center gap-1"><IndianRupee className="h-3 w-3" />{Number(pendingJob.budget).toLocaleString("en-IN")}</span>
              {pendingJob.deadline && (
                <span className="ml-2 inline-flex items-center gap-1"><Timer className="h-3 w-3" />Due {new Date(pendingJob.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
              )}
              {" "}— click Invite on a worker below to send this job.
            </p>
          </div>
        )}

        {!pendingJob && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#F4F6FF] dark:bg-[#1B3FAB]/10">
              <ShieldCheck className="h-4 w-4 text-[#1B3FAB] dark:text-blue-400" />
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-200">Fairness-first ranking.</span>{" "}
              Workers are ordered by Behavior Score, then rating — nobody can buy their way past better talent.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rankedWorkers.map((w, i) => {
            const alreadyInvited = invitedWorkerIds.has(w.id);
            const skills = w.profile?.skills ?? [];
            const isTopRated = (w.rating ?? 0) >= 4.8 && (w.reviews_count ?? 0) >= 20;

            return (
              <div
                key={w.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg wb-card-enter dark:border-slate-800 dark:bg-slate-900/90"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        {w.avatar_url ? (
                          <img src={w.avatar_url} alt={w.name} className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <Avatar initials={getInitials(w.name)} size="w-12 h-12" text="text-sm" />
                        )}
                        <PinnedBadgeOverlay level={w.pinned_milestone_level} size="xs" className="-bottom-1 -right-1" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <h3 className="font-display font-extrabold tracking-tight text-slate-900 dark:text-white text-sm leading-tight">
                            {w.name}
                          </h3>
                          {w.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{w.title || "Worker"}</p>
                        {w.rating != null && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{w.rating}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">({w.reviews_count})</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isTopRated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 border border-[#1B3FAB]/15 px-2 py-1 text-[10px] font-bold text-[#1B3FAB] dark:text-blue-400 flex-shrink-0 ml-2">
                        Top Rated
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${scoreTone(w.behavior_score)}`}>
                        <ShieldCheck className="h-3 w-3" />
                        {w.behavior_score ?? "—"}
                      </span>
                      {w.profile?.hourlyRate && (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-auto">₹{Number(w.profile.hourlyRate).toLocaleString("en-IN")}/hr</span>
                      )}
                    </div>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.slice(0, 6).map((s) => (
                          <span key={s} className="px-2.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 text-xs font-medium rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-end gap-2 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedWorker(w)}
                      className="bg-slate-50 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      View Profile
                    </button>

                    {alreadyInvited ? (
                      <button
                        onClick={() => onViewProjects?.()}
                        className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Invited
                      </button>
                    ) : isVerified ? (
                      <button
                        onClick={() => handleInviteClick(w)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 rounded-lg bg-[#FF6B35] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform hover:bg-[#e55e1f] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Invite
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInviteClick(w)}
                        title="Verify your business to invite workers"
                        className="flex items-center gap-1.5 bg-slate-100 text-slate-500 dark:text-slate-400 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Verify to Invite
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {selectedWorker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
          onClick={() => setSelectedWorker(null)}
        >
          <button
            onClick={() => setSelectedWorker(null)}
            aria-label="Close profile"
            className="fixed top-6 right-6 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="wb-scroll-clean relative w-[95vw] h-[90vh] max-w-6xl bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-y-auto shadow-2xl wb-panel-enter"
            onClick={(event) => event.stopPropagation()}
          >
            {messagingError && (
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-red-50 px-5 py-2.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {messagingError}
              </div>
            )}
            <WorkerShareableProfile
              worker={selectedWorker}
              onMessage={() => handleMessageWorker(selectedWorker)}
              messageBusy={messagingBusy}
            />
          </div>
        </div>
      )}

      {inviteTarget && (
        <Suspense fallback={<SuspenseFallback fullScreen={false} />}>
          <InviteWorkerModal
            worker={inviteTarget}
            openJobs={openJobs}
            onClose={() => setInviteTarget(null)}
            onSubmitExisting={submitExistingJobInvite}
            onSubmitNew={(details) => submitInvite(inviteTarget, details)}
            submitting={submitting}
            error={inviteError}
          />
        </Suspense>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-20 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm font-bold text-emerald-700 shadow-2xl animate-in fade-in slide-in-from-bottom-2 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {toast}
          </span>
        </div>
      )}
    </>
  );
}
