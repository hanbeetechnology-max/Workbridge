import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertCircle, Briefcase, Clock3, History, Loader2, MessageSquare, Play, X } from "lucide-react";
import CelebrationOverlay from "../common/CelebrationOverlay";
import { MILESTONES } from "../../lib/milestones";
import TimelineTracker from "../shared/TimelineTracker";
import ProjectCompletionHub from "../shared/ProjectCompletionHub";
import DeliverablesPanel from "../shared/DeliverablesPanel";
import DeadlineCountdown from "../shared/DeadlineCountdown";
import Avatar from "../shared/Avatar";
import { useAuth } from "../../context/AuthContext";
import { listProjects, updateProjectStatus } from "../../lib/projectsApi";
import { listMyCandidates } from "../../lib/candidatesApi";
import { submitReview, updateReview, listReviewsFor } from "../../lib/reviewsApi";
import { PROJECT_STATUS_META, nextProjectStatus } from "../../utils/projectStatus";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/apiClient";
import { getSocket } from "../../lib/socketClient";
import { getInitials } from "../../utils/formValidation";

const ACTIVE_STATUSES = new Set(["ACCEPTED", "PENDING_FUNDS", "FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED", "PENDING_RELEASE"]);

// Deliverables are the worker's actual finished (or in-progress) work —
// sharing one before Start Work has even been clicked doesn't match the
// real ACCEPTED/PENDING_FUNDS/FUNDS_SECURED -> WORK_IN_PROGRESS flow those
// files are supposed to prove. See DeliverablesPanel.jsx's `locked` prop.
const NOT_STARTED_STATUSES = new Set(["ACCEPTED", "PENDING_FUNDS", "FUNDS_SECURED"]);

// job_candidates.status, worker-facing copy for the "Applied" tab —
// ACCEPTED never actually shows here (accepting turns it into a real
// project, which immediately appears under Active Tasks instead).
const APPLICATION_STATUS_META = {
  PENDING: { label: "Pending Review", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400" },
  DECLINED: { label: "Declined", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800" },
  CLOSED: { label: "Filled by Someone Else", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800" },
};

export default function WorkerWorkspace() {
  useDocumentTitle("Active Workspace — WorkBridge");
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pipelineTab, setPipelineTab] = useState("tasks");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [celebration, setCelebration] = useState(null);
  // CelebrationOverlay shows one moment at a time — a level-up arriving in
  // the same COMPLETED event as a payment is queued here and shown right
  // after the payment celebration is dismissed, rather than trying to
  // stack two overlays at once.
  const [pendingLevelUp, setPendingLevelUp] = useState(null);

  const dismissCelebration = () => {
    if (pendingLevelUp) {
      // If this level exactly matches one of the Badges page's milestones,
      // name the actual badge instead of a generic "Rank Up" — same real
      // currentLevel this modal already gets, just a richer message when
      // it lines up with MILESTONES (WorkerMilestones.jsx's own list).
      const badge = MILESTONES.find((m) => m.level === pendingLevelUp);
      setCelebration({
        variant: "milestone",
        title: badge ? `Badge unlocked: ${badge.name}` : `Level up — you've reached Level ${pendingLevelUp}`,
        message: badge
          ? `${badge.reward} — see it on your Badges page.`
          : "Keep completing projects on time to climb the next tier.",
      });
      setPendingLevelUp(null);
    } else {
      setCelebration(null);
    }
  };
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [existingReview, setExistingReview] = useState(undefined);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listProjects({ role: "worker" })
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        const active = data.filter((p) => ACTIVE_STATUSES.has(p.status));
        setSelectedTaskId(active[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Could not load your workspace.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The "Applied" tab — job_candidates rows, not projects (an OPEN post's
  // worker_id stays null until someone's accepted, so listProjects above
  // can never surface a pending application). Loaded separately and doesn't
  // block the main workspace render — a failure here just leaves the tab
  // showing its own empty state rather than erroring the whole page.
  useEffect(() => {
    let cancelled = false;
    listMyCandidates()
      .then((data) => {
        if (!cancelled) setApplications(data.filter((c) => c.source === "APPLICATION"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Dismissing a resolved (DECLINED/CLOSED) application is purely a
  // personal declutter preference — there's no "archived" concept in
  // job_candidates, and inventing a column/migration for what's just a
  // per-device hide isn't worth it. localStorage persists it across
  // reloads without touching the backend at all.
  const [dismissedApplicationIds, setDismissedApplicationIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("wb_dismissed_applications") ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const dismissApplication = (id) => {
    setDismissedApplicationIds((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem("wb_dismissed_applications", JSON.stringify([...next]));
      return next;
    });
    if (selectedApplicationId === id) setSelectedApplicationId(null);
  };

  // Same real, per-device declutter pattern as dismissedApplicationIds
  // above — a completed/cancelled project stays a real, permanent DB
  // record (payment history, dispute record) either way; this only hides
  // it from THIS device's own pipeline list once it's no longer useful to
  // see there.
  const [dismissedHistoryIds, setDismissedHistoryIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("wb_dismissed_history") ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const dismissHistoryTask = (id) => {
    setDismissedHistoryIds((prev) => {
      const next = new Set(prev).add(id);
      localStorage.setItem("wb_dismissed_history", JSON.stringify([...next]));
      return next;
    });
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const tasks = projects.filter((p) => ACTIVE_STATUSES.has(p.status));
  // Declining an invite (or any other cancellation) used to just vanish —
  // not "active" (excluded from ACTIVE_STATUSES) and not "history" (this
  // filter used to be COMPLETED-only), so there was nowhere it could ever
  // be seen again after the fact.
  const historyTasks = projects
    .filter((p) => p.status === "COMPLETED" || p.status === "CANCELLED")
    .filter((p) => !dismissedHistoryIds.has(p.id));
  const activeList = pipelineTab === "tasks" ? tasks : pipelineTab === "history" ? historyTasks : [];
  const selectedTask = activeList.find((task) => task.id === selectedTaskId) ?? null;

  // Still-in-play applications first (most recent first), decided ones
  // (declined / filled by someone else — no chance left) sink to the
  // bottom instead of cluttering the top of a list that's meant to
  // highlight what still has a shot.
  const visibleApplications = applications
    .filter((a) => !dismissedApplicationIds.has(a.id))
    .sort((a, b) => {
      const aPending = a.status === "PENDING";
      const bPending = b.status === "PENDING";
      if (aPending !== bPending) return aPending ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  const pendingApplicationCount = applications.filter((a) => a.status === "PENDING").length;
  const selectedApplication = applications.find((a) => a.id === selectedApplicationId) ?? null;

  useEffect(() => {
    if (selectedTask?.status !== "COMPLETED") {
      setExistingReview(undefined);
      return;
    }
    let cancelled = false;
    setExistingReview(undefined);
    listReviewsFor(selectedTask.business_id)
      .then((reviews) => {
        if (cancelled) return;
        const mine = reviews.find((r) => r.project_id === selectedTask.id && r.reviewer_id === currentUser?.id);
        setExistingReview(mine ?? null);
      })
      .catch(() => {
        if (!cancelled) setExistingReview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTask?.id, selectedTask?.status, selectedTask?.business_id, currentUser?.id]);

  const handleSelectTask = (id) => setSelectedTaskId(id);
  const handleSelectApplication = (id) => setSelectedApplicationId(id);

  const handlePipelineTab = (tab) => {
    setPipelineTab(tab);
    if (tab === "applied") {
      setSelectedApplicationId(visibleApplications[0]?.id ?? null);
      return;
    }
    const list = tab === "tasks" ? tasks : historyTasks;
    setSelectedTaskId(list[0]?.id ?? null);
  };

  const patchProject = (updated) => {
    setProjects((current) => current.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  // Kept in a ref (not read from `projects` directly) so the socket
  // subscription below — mounted once — never closes over a stale list.
  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Live nudge for state changes the business/admin side makes while this
  // tab is open — the REST call already updated their own view; this is
  // purely so the worker doesn't have to refresh to see it. Events this
  // same worker triggered elsewhere (another tab, or their own submission)
  // patch state silently without a redundant toast. See
  // backend/src/realtime/events.js for the emit side.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      const project = projectsRef.current.find((p) => p.id === event.projectId);
      if (!project) return;

      switch (event.type) {
        case "FUNDS_SECURED":
          patchProject({ id: event.projectId, status: "FUNDS_SECURED" });
          toast.success(`${project.business_name} just secured the funds for "${project.title}"!`);
          break;
        case "COMPLETED":
          patchProject({ id: event.projectId, status: "COMPLETED" });
          // The "paid" celebration variant already existed in
          // CelebrationOverlay but nothing ever triggered it — a worker
          // actually getting paid is the single biggest moment in this app,
          // and it was showing a plain toast instead.
          setCelebration({
            variant: "paid",
            title: "Payment received",
            message: `${project.business_name} approved "${project.title}" — the funds are in your wallet.`,
            amount: event.earnings,
            rewards: { xp: event.workerXpDelta, tokens: event.workerTokenDelta },
          });
          if (event.leveledUp) setPendingLevelUp(event.newLevel);
          break;
        case "STATUS_CHANGED":
          patchProject({ id: event.projectId, status: event.status });
          if (event.actorRole !== "worker") {
            if (event.status === "WORK_IN_PROGRESS" && event.note) {
              toast.info(`${project.business_name} requested a revision on "${project.title}": ${event.note}`);
            } else {
              toast.info(`${project.business_name} updated "${project.title}" to ${event.status.replaceAll("_", " ").toLowerCase()}.`);
            }
          }
          break;
        case "SUBMISSION_CREATED":
          if (event.submittedBy !== currentUser?.id) {
            toast.info(`${project.business_name} shared new reference material on "${project.title}".`);
          }
          break;
        case "SUBMISSION_REVIEWED":
          if (event.submittedBy === currentUser?.id) {
            toast[event.status === "APPROVED" ? "success" : "error"](
              `Your submission on "${project.title}" was ${event.status.toLowerCase()}.`
            );
          } else if (event.status === "APPROVED") {
            // The business's own submission (reference material, etc.) just
            // cleared moderation and became visible — previously silent, so
            // approved content from the business could sit unnoticed in
            // Deliverables with no signal it had ever arrived.
            toast.info(`${project.business_name} shared new approved content on "${project.title}".`);
          }
          break;
        case "REVIEW_SUBMITTED":
          if (event.revieweeId === currentUser?.id) {
            toast.success(`${project.business_name} left you a ${event.rating}★ review on "${project.title}".`);
          }
          break;
        default:
          break;
      }
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
  }, []);

  // Worker's turn to act (Start Work / Submit Work) — Approve & Release /
  // Secure Funds are business-only and happen from the business dashboard.
  const handleAdvance = async () => {
    if (!selectedTask) return;
    const meta = PROJECT_STATUS_META[selectedTask.status];
    if (meta?.actionBy !== "worker") return;
    const next = nextProjectStatus(selectedTask.status);
    if (!next) return;

    setAdvancing(true);
    setActionError("");
    try {
      const updated = await updateProjectStatus(selectedTask.id, next);
      patchProject(updated);
      setCelebration({
        variant: "milestone",
        title: next === "FILES_SUBMITTED" ? "Files submitted" : "Work started",
        message:
          next === "FILES_SUBMITTED"
            ? `${selectedTask.business_name} has been notified — payment releases once they approve.`
            : `${selectedTask.business_name} can now see this project is underway.`,
      });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update this project.");
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center dark:bg-slate-950">
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* The Dual-Ban Moderation Engine's soft tier — a persistent, page-
          level heads-up (not just the inline notice inside a given chat, see
          ChatThread.jsx) so a chat-banned worker sees this the moment they
          land in their workspace, before they even open a conversation. */}
      {currentUser?.is_chat_banned && (
        <div className="flex flex-shrink-0 items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/40 dark:bg-amber-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            Your chat privileges have been temporarily suspended due to a policy violation. You can still submit
            active deliverables to receive payment.
          </p>
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden overflow-x-hidden bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900 md:flex-row">
      <aside className="flex max-h-[45vh] min-h-0 w-full flex-col border-b border-slate-200 bg-slate-50 p-4 sm:p-5 md:max-h-none md:w-[40%] md:min-w-[320px] md:max-w-[440px] md:border-b-0 md:border-r dark:border-slate-800 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            {/* <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">'Pending' ➔ 'In Progress' ➔ 'In Review' ➔ 'Completed'</p> */}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Good Luck With Your Work!</h2>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 shadow-sm dark:bg-slate-800">
            {tasks.length} live
          </div>
        </div>

        <div className="mb-4 flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
          {[
            { id: "applied", label: "Applied", count: pendingApplicationCount, icon: Clock3 },
            { id: "tasks", label: "Active Tasks", count: tasks.length, icon: Briefcase },
            { id: "history", label: "History", count: historyTasks.length, icon: History },
          ].map(({ id, label, count, icon: Icon }) => {
            const active = pipelineTab === id;
            return (
              <button
                key={id}
                onClick={() => handlePipelineTab(id)}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold transition-all ${
                  active ? "bg-white text-slate-900 dark:text-white shadow-sm dark:bg-slate-700" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-[#ff6b35] text-white" : "bg-slate-200 text-slate-600 dark:text-slate-300 dark:bg-slate-700"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="wb-scroll-clean flex-1 space-y-3 overflow-y-auto pr-1">
          {pipelineTab === "applied" ? (
            visibleApplications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-xs text-slate-400 dark:text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                No pending applications — jobs you apply to on the Job Feed show up here.
              </div>
            ) : (
              visibleApplications.map((application) => {
                const statusMeta = APPLICATION_STATUS_META[application.status] ?? APPLICATION_STATUS_META.PENDING;
                const isResolved = application.status !== "PENDING";
                return (
                  <motion.div
                    key={application.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectApplication(application.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectApplication(application.id)}
                    className={`relative w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
                      selectedApplicationId === application.id
                        ? "border-slate-200 border-l-4 border-l-[#FF6B35] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        : "border-slate-200/80 bg-white/50 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isResolved && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissApplication(application.id);
                        }}
                        aria-label="Dismiss this application"
                        title="Dismiss"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex items-start gap-2.5 pr-5">
                      <Avatar initials={getInitials(application.business_name)} avatarUrl={application.business_avatar_url} bg="bg-[#1B3FAB]" size="w-8 h-8" text="text-[10px]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{application.project_title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{application.business_name}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        ₹{Number(application.budget).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )
          ) : (
            <>
              {activeList.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-xs text-slate-400 dark:text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                  {pipelineTab === "tasks" ? "No active tasks yet." : "No completed projects yet."}
                </div>
              )}
              {activeList.map((task) => {
                const meta = PROJECT_STATUS_META[task.status];
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectTask(task.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectTask(task.id)}
                    className={`relative w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
                      selectedTaskId === task.id
                        ? "border-slate-200 border-l-4 border-l-[#FF6B35] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        : "border-slate-200/80 bg-white/50 hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                    }`}
                  >
                    {/* History declutter — a real, per-device hide (see
                        dismissedHistoryIds above), not a DB delete. The
                        underlying project/payment record stays exactly as
                        it was; this just removes it from this device's own
                        pipeline list once it's no longer useful to see. */}
                    {pipelineTab === "history" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissHistoryTask(task.id);
                        }}
                        aria-label="Remove from history"
                        title="Remove from history"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex items-start justify-between gap-3 pr-5">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Avatar initials={getInitials(task.business_name)} avatarUrl={task.business_avatar_url} bg="bg-[#1B3FAB]" size="w-8 h-8" text="text-[10px]" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{task.business_name}</p>
                        </div>
                      </div>
                      {task.new_deliverables_count > 0 && (
                        <span
                          className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm"
                          aria-label={`${task.new_deliverables_count} new deliverable${task.new_deliverables_count === 1 ? "" : "s"} from ${task.business_name}`}
                          title="New approved deliverable"
                        >
                          {task.new_deliverables_count}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          task.status === "COMPLETED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "border-slate-200 bg-slate-50 text-slate-600 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800"
                        }`}
                      >
                        {meta?.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">₹{Number(task.budget).toLocaleString("en-IN")}</span>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>
      </aside>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/50 dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900">
        {pipelineTab === "applied" ? (
          selectedApplication ? (
            <ApplicationDetail application={selectedApplication} navigate={navigate} />
          ) : (
            <ApplicationEmptyState />
          )
        ) : selectedTask?.status === "COMPLETED" ? (
          existingReview === undefined ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
            </div>
          ) : (
            <>
              {reviewError && (
                <div className="m-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{reviewError}</span>
                </div>
              )}
              <ProjectCompletionHub
                perspective="worker"
                counterpartName={selectedTask.business_name}
                // Real net payout, not the gross project budget — "released
                // to your wallet" was quoting the full budget while the
                // platform fee (completeProject, backend) actually deducts
                // it before crediting the wallet, overstating what landed
                // there. Gross stays the honest figure everywhere else
                // (Job Feed, the task list here) — this one spot is
                // specifically claiming what was deposited, so it has to
                // match the real deposit.
                amount={Math.round(Number(selectedTask.budget) * (1 - Number(selectedTask.platform_fee_pct ?? 15) / 100))}
                review={existingReview}
                onSubmit={async (rating, feedback) => {
                  setReviewError("");
                  try {
                    const saved = existingReview
                      ? await updateReview({ projectId: selectedTask.id, rating, feedback })
                      : await submitReview({ projectId: selectedTask.id, rating, feedback });
                    setExistingReview(saved);
                    return saved;
                  } catch (err) {
                    setReviewError(err instanceof ApiError ? err.message : "Could not submit review.");
                    throw err;
                  }
                }}
              />
            </>
          )
        ) : selectedTask ? (
          <>
            <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:p-6 md:flex-row md:items-start md:justify-between dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800">
                    {PROJECT_STATUS_META[selectedTask.status]?.label}
                  </span>
                  <h3 className="font-display mt-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                    {selectedTask.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {selectedTask.business_name}
                    {selectedTask.deadline && ` / Due ${new Date(selectedTask.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                  <div className="mt-2">
                    <DeadlineCountdown deadline={selectedTask.deadline} status={selectedTask.status} />
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="md:text-right">
                    <p className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">₹{Number(selectedTask.budget).toLocaleString("en-IN")}</p>
                    {selectedTask.status !== "ACCEPTED" && (
                      <p className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">Funds Secured</p>
                    )}
                  </div>
                  {/* The one action this project actually needs from the
                      worker right now (Start Work / Submit Work) — anchored
                      directly under the budget instead of a floating bar at
                      the bottom of the page, so it reads as "the next thing
                      to do about this money" rather than a stray button. */}
                  {PROJECT_STATUS_META[selectedTask.status]?.actionBy === "worker" && (
                    <button
                      onClick={handleAdvance}
                      disabled={advancing}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:bg-[#E55A2B] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 md:w-auto"
                    >
                      {advancing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating…
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          {PROJECT_STATUS_META[selectedTask.status].nextActionLabel}
                        </>
                      )}
                    </button>
                  )}
                </div>
            </header>

            <div className="wb-scroll-clean flex-1 space-y-6 overflow-y-auto p-4 pb-40 sm:p-8">
              {actionError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}
              <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Project Lifecycle</h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Connected delivery timeline for payment release.</p>
                </div>
                <span className="self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:self-auto dark:bg-emerald-950/30 dark:text-emerald-400">Secure delivery</span>
              </div>
              <div className="-mx-4 sm:-mx-6">
                <TimelineTracker status={selectedTask.status} />
              </div>
            </motion.div>

              <div className="grid gap-5">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
                <DeliverablesPanel
                  projectId={selectedTask.id}
                  readOnly={selectedTask.status === "CANCELLED"}
                  locked={NOT_STARTED_STATUSES.has(selectedTask.status)}
                  // "Click Start Work above" was shown for ACCEPTED and
                  // PENDING_FUNDS too, but that button only actually exists
                  // once FUNDS_SECURED — at those earlier statuses it's the
                  // business's turn (securing funds), not the worker's, so
                  // there's nothing above to click yet. Telling a worker to
                  // click a button that isn't there is the exact "where is
                  // the Start button?!" confusion this caused.
                  lockedMessage={
                    selectedTask.status === "FUNDS_SECURED"
                      ? 'Click "Start Work" above to begin — you can share deliverables once work is underway.'
                      : "Waiting on the business to secure funds in escrow — you'll be able to start work once that's done."
                  }
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.11 }}>
                <button
                  type="button"
                  onClick={() => navigate(`/worker/negotiations?invite=${selectedTask.id}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#1B3FAB]/20 bg-[#F4F6FF] px-5 py-4 text-sm font-bold text-[#1B3FAB] dark:text-blue-400 transition hover:bg-[#1B3FAB]/10 dark:border-[#1B3FAB]/30 dark:bg-[#1B3FAB]/10 dark:hover:bg-[#1B3FAB]/15"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open Chat in Chats
                </button>
              </motion.div>
              </div>
            </div>
            {(selectedTask.status === "FILES_SUBMITTED" || selectedTask.status === "PENDING_RELEASE") && (
            /* Just the "what's happening now" status, not an action anymore
               — the real next action (Start Work / Submit Work) moved to
               the header, directly under the budget. Sized to its own
               content (not left-3/right-3 full-width) — a full-width bar
               here would sit on top of whatever's scrolled underneath it
               (e.g. the "Open Chat in Negotiations" button), blocking
               clicks on empty space that isn't even part of this status. */
            <div className="absolute bottom-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur sm:bottom-5 sm:right-8 sm:gap-3 sm:p-2.5 dark:border-slate-700 dark:bg-slate-900/95">
              {selectedTask.status === "FILES_SUBMITTED" && (
                <span className="flex min-h-[36px] items-center gap-2 whitespace-nowrap text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-500" />
                  Awaiting business approval &amp; fund release
                </span>
              )}
              {selectedTask.status === "PENDING_RELEASE" && (
                <span className="flex min-h-[36px] items-center gap-2 whitespace-nowrap text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-500" />
                  Release requested — WorkBridge is processing your payout
                </span>
              )}
            </div>
            )}
          </>
        ) : (
          <WorkspaceEmptyState />
        )}
      </main>

      {celebration && (
        <CelebrationOverlay
          variant={celebration.variant}
          title={celebration.title}
          message={celebration.message}
          amount={celebration.amount}
          rewards={celebration.rewards}
          primaryLabel="Keep Working"
          onPrimary={() => dismissCelebration()}
          onClose={() => dismissCelebration()}
        />
      )}
      </div>
    </div>
  );
}

function WorkspaceEmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <Briefcase className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Pick a project</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">Choose a task from your pipeline and its workspace opens up here.</p>
      </div>
    </div>
  );
}

function ApplicationEmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/70">
      <div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
          <Clock3 className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Pick an application</h3>
        <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">Choose one from the list to see what you sent and where it stands.</p>
      </div>
    </div>
  );
}

// No chat, no deliverables, nothing actionable yet — an application is
// still just a candidacy on an OPEN post (see messages.controller.js's
// mustBeParticipant: worker_id is null until a business accepts, so a
// pending applicant genuinely can't message them). This is read-only,
// deliberately simpler than the real task detail panel above.
function ApplicationDetail({ application, navigate }) {
  const statusMeta = APPLICATION_STATUS_META[application.status] ?? APPLICATION_STATUS_META.PENDING;
  const appliedDate = new Date(application.created_at).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="wb-scroll-clean flex-1 space-y-6 overflow-y-auto p-4 pb-40 sm:p-8">
      <header className="border-b border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
        <h3 className="font-display mt-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
          {application.project_title}
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {application.business_name} · Applied {appliedDate}
        </p>
        <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">₹{Number(application.budget).toLocaleString("en-IN")}</p>
      </header>

      {application.description && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Job Brief</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{application.description}</p>
        </div>
      )}

      {application.message && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">What you sent them</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{application.message}</p>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3.5 dark:border-blue-900/40 dark:bg-blue-500/10">
        <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
        <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-400">
          {application.status === "PENDING"
            ? "This business hasn't decided yet — messaging opens up automatically here if they accept you."
            : application.status === "DECLINED"
              ? "This business decided not to move forward with this application."
              : "Someone else was accepted for this job."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/worker")}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <Briefcase className="h-3.5 w-3.5" />
        Back to Job Feed
      </button>
    </div>
  );
}
