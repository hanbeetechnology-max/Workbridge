import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Clock3,
  Coins,
  Flame,
  GraduationCap,
  IndianRupee,
  Loader2,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

// The real, fixed reward every completed job pays out — see
// projects.controller.js's completeProject (xpDelta: 50,
// tokenDelta: COMPLETION_TOKEN_REWARD = 25). Flat per completion, not tied
// to this job's budget, so it's safe to show the same number on every
// card rather than computing/guessing a per-job figure.
const COMPLETION_XP_REWARD = 50;
const COMPLETION_TOKEN_REWARD = 25;
import { listOpenProjects, getFeaturedEmployers } from "../../lib/projectsApi";
import PerkCountdown from "../shared/PerkCountdown";
import { applyToProject, listMyCandidates, respondToCandidate } from "../../lib/candidatesApi";
import { ApiError } from "../../lib/apiClient";
import { getSocket } from "../../lib/socketClient";
// Only renders once a job with a quiz is actually opened, never on initial
// page load — lazy-loaded rather than bundled into the feed's own chunk.
// It has no exit animation of its own (plain `if (!open) return null`), so
// gating its mount externally below changes nothing about how it closes.
const ApplicationQuizModal = lazy(() => import("./ApplicationQuizModal"));
import SuspenseFallback from "../common/SuspenseFallback";
import JobFilters from "./JobFilters";
import { EDUCATION_LABELS } from "../../utils/educationLevels";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function timeAgo(dateString) {
  const ms = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Feature #1 — Job Timelines & Availability Windows. application_deadline
// is a real future timestamp set at posting time (see
// projects.controller.js's resolveApplicationDeadline); this only formats
// it, it doesn't invent one.
function formatApplicationWindow(applicationDeadline) {
  if (!applicationDeadline) return null;
  const ms = new Date(applicationDeadline).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `Closes in ${hours}h`;
  return `Closes in ${Math.ceil(hours / 24)}d`;
}

// ANY (no requirement) and unset both render nothing — a qualifications
// chip only ever shows a real requirement the business actually set.
function formatExperience(job) {
  const min = job.min_experience_years;
  const max = job.max_experience_years;
  if (min != null && max != null) return `${min}-${max} yrs exp`;
  if (min != null) return `${min}+ yrs exp`;
  if (max != null) return `Up to ${max} yrs exp`;
  return null;
}

function formatEducation(job) {
  return EDUCATION_LABELS[job.education_level] ?? null;
}

// Pinned, non-dismissible — this used to be a floating toast a worker could
// close forever for the session (sessionStorage), which meant most workers
// only ever saw it once. It's real, honest copy (every worker genuinely is
// on the free tier — see WorkerWallet.jsx's SUBSCRIPTION_TIERS), so it stays
// visible at the top of the feed on every visit instead, matching how the
// Enterprise Partner Tier card is always-on for businesses on Overview.
function SubscriptionBanner({ onUpgrade }) {
  return (
    <div className="mb-6 flex flex-col items-start gap-4 rounded-2xl border border-white/20 p-5 shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:justify-between" style={{ backgroundColor: "rgba(15, 23, 42, 0.92)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Sparkles className="h-5 w-5 text-[#FF6B35]" />
        </div>
        <p className="text-sm font-semibold leading-6 text-white">
          Unlock Premium Matches and priority job visibility. Upgrade to Elite today! ⚡
        </p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="flex flex-shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#e55e1f]"
      >
        <Zap className="h-3.5 w-3.5" />
        See Elite Perks
      </button>
    </div>
  );
}

// The real apply flow — a proposal note + submit, straight to
// POST /api/projects/:id/candidates. No quiz/points system here since
// there's no backend for either; this is the actual apply action.
function JobDetailModal({ job, onClose, onApply, applying, applyError, alreadyApplied }) {
  const [message, setMessage] = useState("");

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{job.business_name}</p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{job.title}</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="wb-scroll-clean min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Budget</p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{formatINR(job.budget)}</p>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Applicants</p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{job.applicant_count ?? 0}</p>
            </div>
            <div className="border-r border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Posted</p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{timeAgo(job.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Deadline</p>
              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                {job.deadline ? new Date(job.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Flexible"}
              </p>
            </div>
          </div>

          {(formatExperience(job) || formatEducation(job) || job.required_skills?.length > 0) && (
            <>
              <h3 className="mt-6 text-sm font-bold text-slate-900 dark:text-white">Qualifications</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {formatExperience(job) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#1B3FAB]/15 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 text-xs font-semibold text-[#1B3FAB] dark:text-blue-400">
                    <Clock className="h-3 w-3" />
                    {formatExperience(job)}
                  </span>
                )}
                {formatEducation(job) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#1B3FAB]/15 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 text-xs font-semibold text-[#1B3FAB] dark:text-blue-400">
                    <GraduationCap className="h-3 w-3" />
                    {formatEducation(job)}
                    {job.education_notes ? ` — ${job.education_notes}` : ""}
                  </span>
                )}
              </div>
              {job.required_skills?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.required_skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          <h3 className="mt-6 text-sm font-bold text-slate-900 dark:text-white">Brief</h3>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-slate-700 dark:text-slate-300">
            {job.description || "No further details were added to this post."}
          </p>

          {!alreadyApplied && (
            <>
              <h3 className="mt-6 text-sm font-bold text-slate-900 dark:text-white">Your proposal note (optional)</h3>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Briefly say why you're a good fit, and any questions about scope or timeline."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
              />
            </>
          )}

          {applyError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{applyError}</span>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            Close
          </button>
          {alreadyApplied ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Already applied
            </span>
          ) : (
            <button
              onClick={() => onApply(message)}
              disabled={applying}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E55E1F] disabled:opacity-60"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {applying ? "Submitting…" : "Apply Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// A direct invite from a business, waiting on this worker's Accept/Decline —
// distinct from an application the worker sent out themselves.
function InviteCard({ candidate, onRespond, responding }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1B3FAB]/20 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-5 py-4 dark:border-[#1B3FAB]/30">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#1B3FAB] dark:text-blue-400">
          <Sparkles className="h-3.5 w-3.5" />
          Direct invite from {candidate.business_name}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{candidate.project_title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{formatINR(candidate.budget)}</p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        <button
          onClick={() => onRespond(candidate.id, false)}
          disabled={responding}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          Decline
        </button>
        <button
          onClick={() => onRespond(candidate.id, true)}
          disabled={responding}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3FAB] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#15338d] disabled:opacity-60 dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
        >
          {responding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Accept
        </button>
      </div>
    </div>
  );
}

export default function WorkerJobFeed() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [applying, setApplying] = useState(false);
  const [myCandidates, setMyCandidates] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  // Proposal note + job carried from JobDetailModal into the quiz step —
  // "Apply Now" no longer submits directly, it opens ApplicationQuizModal
  // first (selectedJob closes with JobDetailModal, so the job being applied
  // to needs its own state here).
  const [pendingMessage, setPendingMessage] = useState("");
  const [quizJob, setQuizJob] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [budgetRange, setBudgetRange] = useState({ min: "", max: "" });
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [selectedEducationLevels, setSelectedEducationLevels] = useState([]);
  // The worker's OWN years of experience, not a job-side range — a single
  // number answers "which jobs am I actually eligible for" directly,
  // checked against each job's real min/max_experience_years below.
  const [yourExperience, setYourExperience] = useState("");
  // LinkedIn-style collapsible filter drawer — collapsed by default so the
  // feed itself stays the focus; opening it is a deliberate action, not
  // permanent screen real estate the way the earlier sidebar was.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Real effect of the "Featured Employer Spotlight" perk — businesses with
  // an active purchase, shown as a strip above the feed. Non-critical, so a
  // failed fetch just leaves the strip empty rather than erroring the page.
  const [featuredEmployers, setFeaturedEmployers] = useState([]);

  const loadJobs = () => {
    listOpenProjects()
      .then(setJobs)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load the job feed."))
      .finally(() => setLoading(false));
  };

  const loadMyCandidates = () => {
    listMyCandidates().then(setMyCandidates).catch(() => {});
  };

  useEffect(() => {
    loadJobs();
    loadMyCandidates();
    getFeaturedEmployers().then(setFeaturedEmployers).catch(() => {});
  }, []);

  // Applications/invites move fast (someone else can fill a job at any
  // moment) — refetch both the feed and "my candidates" on any candidate
  // lifecycle event, rather than only reacting to ones this tab caused.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const handleProjectEvent = (event) => {
      if (!["CANDIDATE_CREATED", "CANDIDATE_ACCEPTED", "CANDIDATE_DECLINED", "JOB_FILLED"].includes(event.type)) return;
      loadMyCandidates();
      if (event.type === "CANDIDATE_ACCEPTED" || event.type === "JOB_FILLED") loadJobs();
    };

    socket.on("project:event", handleProjectEvent);
    return () => socket.off("project:event", handleProjectEvent);
  }, []);

  const pendingInvites = myCandidates.filter((c) => c.source === "INVITE" && c.status === "PENDING");
  const appliedProjectIds = new Set(myCandidates.filter((c) => c.source === "APPLICATION").map((c) => c.project_id));

  // Every real skill currently posted across open jobs, not a fixed guessed
  // taxonomy — see JobFilters.jsx. Recomputed whenever the feed reloads, so
  // a skill nobody's hiring for right now never shows as a dead filter.
  const allSkills = useMemo(() => {
    const skills = new Set();
    for (const job of jobs) {
      for (const skill of job.required_skills ?? []) skills.add(skill);
    }
    return Array.from(skills).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  // The drawer toggle's own badge — deliberately excludes the search query
  // (that's always visible above, not something the drawer needs to surface)
  // unlike hasActiveFilters below, which also decides the empty-state copy.
  const activeFilterCount =
    selectedSkills.length +
    selectedEducationLevels.length +
    (urgentOnly ? 1 : 0) +
    (budgetRange.min !== "" ? 1 : 0) +
    (budgetRange.max !== "" ? 1 : 0) +
    (yourExperience !== "" ? 1 : 0);

  const hasActiveFilters = Boolean(query.trim()) || activeFilterCount > 0;

  const toggleSkill = (skill) => {
    setSelectedSkills((current) => (current.includes(skill) ? current.filter((s) => s !== skill) : [...current, skill]));
  };

  const toggleEducationLevel = (level) => {
    setSelectedEducationLevels((current) =>
      current.includes(level) ? current.filter((l) => l !== level) : [...current, level]
    );
  };

  const clearFilters = () => {
    setQuery("");
    setSelectedSkills([]);
    setBudgetRange({ min: "", max: "" });
    setUrgentOnly(false);
    setSelectedEducationLevels([]);
    setYourExperience("");
  };

  // Real win for useMemo, not a superstitious one: this component re-renders
  // on plenty of state unrelated to the filters themselves (opening a job's
  // detail modal, the quiz modal, applying, etc.), and without this the
  // full filter/scan over `jobs` re-ran on every single one of those too.
  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (query.trim()) {
          const searchable = `${job.title} ${job.description ?? ""} ${job.business_name}`.toLowerCase();
          if (!searchable.includes(query.trim().toLowerCase())) return false;
        }
        if (urgentOnly && !job.is_urgent) return false;
        const budget = Number(job.budget);
        if (budgetRange.min !== "" && budget < Number(budgetRange.min)) return false;
        if (budgetRange.max !== "" && budget > Number(budgetRange.max)) return false;
        if (selectedSkills.length > 0 && !selectedSkills.some((skill) => job.required_skills?.includes(skill))) return false;
        // ANY means the business set no real requirement, so it always
        // qualifies regardless of which levels are checked.
        if (
          selectedEducationLevels.length > 0 &&
          job.education_level !== "ANY" &&
          !selectedEducationLevels.includes(job.education_level)
        ) {
          return false;
        }
        if (yourExperience !== "") {
          const years = Number(yourExperience);
          if (job.min_experience_years != null && years < job.min_experience_years) return false;
          if (job.max_experience_years != null && years > job.max_experience_years) return false;
        }
        return true;
      }),
    [jobs, query, urgentOnly, budgetRange, selectedSkills, selectedEducationLevels, yourExperience]
  );

  // JobDetailModal's "Apply Now" no longer applies directly — it opens the
  // quiz step instead. The real POST /candidates call (and the real
  // Behavior Score delta) only happens once the worker picks one of the
  // quiz's two actions below.
  const handleProceedToQuiz = (message) => {
    if (!selectedJob) return;
    setPendingMessage(message);
    setQuizJob(selectedJob);
    setSelectedJob(null);
  };

  const submitApplication = async (quizAnswered) => {
    if (!quizJob) return;
    setApplying(true);
    try {
      await applyToProject(quizJob.id, pendingMessage.trim() || undefined, quizAnswered);
      toast.success(
        quizAnswered
          ? "Application submitted — +15 Behavior Score for answering."
          : "Application submitted — -5 Behavior Score for skipping the quiz."
      );
      setQuizJob(null);
      setPendingMessage("");
      loadMyCandidates();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit your application.");
      setQuizJob(null);
    } finally {
      setApplying(false);
    }
  };

  const handleRespond = async (candidateId, accept) => {
    setRespondingId(candidateId);
    try {
      await respondToCandidate(candidateId, accept);
      toast.success(accept ? "Invitation accepted — check Active Workspace." : "Invitation declined.");
      loadMyCandidates();
      loadJobs();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not respond to this invite.");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="wb-scroll-clean relative h-full min-h-0 overflow-y-auto bg-gradient-to-br from-[#dbe4ff] via-[#eef1ff] to-[#ffe4d2] pb-20 text-slate-900 dark:text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <section className="relative w-full px-6 py-8">
        <SubscriptionBanner onUpgrade={() => toast.info("Subscriptions are coming soon!")} />

        <div className="mb-8 rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl p-6 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">WorkBridge Job Feed</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Open jobs, live right now</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Every job here is real and unassigned — apply, and the business decides who to bring on. A business can also
            invite you directly to one of these while it's still open.
          </p>

          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, business, or skill"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#1B3FAB] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        {pendingInvites.length > 0 && (
          <div className="mb-8 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Invites for you</h2>
            {pendingInvites.map((candidate) => (
              <InviteCard
                key={candidate.id}
                candidate={candidate}
                onRespond={handleRespond}
                responding={respondingId === candidate.id}
              />
            ))}
          </div>
        )}

        {/* LinkedIn-style collapsible filter drawer — a toggle rather than
            the permanent sidebar this used to be, so the feed itself stays
            the focus until a worker actually wants to narrow it down. */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B35] px-1.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <motion.span animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 transition-colors hover:text-[#FF6B35]"
            >
              Clear all
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mb-6">
                <JobFilters
                  allSkills={allSkills}
                  selectedSkills={selectedSkills}
                  onToggleSkill={toggleSkill}
                  budgetRange={budgetRange}
                  onBudgetChange={setBudgetRange}
                  urgentOnly={urgentOnly}
                  onToggleUrgent={() => setUrgentOnly((value) => !value)}
                  selectedEducationLevels={selectedEducationLevels}
                  onToggleEducationLevel={toggleEducationLevel}
                  yourExperience={yourExperience}
                  onExperienceChange={setYourExperience}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {featuredEmployers.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-[#FF6B35]" />
              Featured Employers
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {featuredEmployers.map((employer) => (
                <button
                  key={employer.id}
                  type="button"
                  onClick={() => setQuery(employer.business_name)}
                  className="flex flex-shrink-0 items-center gap-2.5 rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-violet-900/40 dark:bg-violet-500/10"
                >
                  {employer.avatar_url ? (
                    <img src={employer.avatar_url} alt={employer.business_name} className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500 text-xs font-bold text-white">
                      {employer.business_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{employer.business_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {employer.open_job_count} open job{employer.open_job_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="min-w-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
              </div>
            ) : loadError ? (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-white/70 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-slate-900/70 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{loadError}</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl p-10 text-center shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60">
                <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  {hasActiveFilters ? "No jobs match your filters" : "No open jobs right now"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {hasActiveFilters
                    ? "Try widening your budget range or clearing a skill filter."
                    : "New posts show up here as businesses hire — check back soon."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              // auto-fit (not auto-fill) so a sparse feed doesn't leave a
              // card squeezed into one skinny track next to empty phantom
              // ones — with few jobs, existing cards claim their real
              // 320-400px width and leave the leftover space trailing after
              // them instead of splitting it into unused equal-width tracks.
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(320px,400px))]">
                {filteredJobs.map((job, index) => {
              const alreadyApplied = appliedProjectIds.has(job.id);

              return (
                <motion.article
                  key={job.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
                  whileHover={{ y: -4 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedJob(job)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedJob(job);
                    }
                  }}
                  className={`cursor-pointer rounded-2xl border p-5 shadow-lg backdrop-blur-xl transition-shadow duration-300 hover:shadow-xl ${
                    job.is_urgent
                      ? "border-[#FF6B35]/40 bg-orange-50/50 shadow-orange-200/40 dark:border-sky-500/30 dark:bg-sky-500/5 dark:shadow-sky-500/20 dark:hover:border-sky-400/60 dark:hover:shadow-sky-400/40"
                      : "border-white/70 bg-white/60 shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          <Briefcase className="h-3 w-3" />
                          {job.business_name}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 dark:bg-slate-800">
                          <IndianRupee className="h-3 w-3" />
                          {Number(job.budget).toLocaleString("en-IN")}
                        </span>
                        {job.is_urgent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B35] px-2 py-0.5 text-[11px] font-bold text-white">
                            <Flame className="h-3 w-3" />
                            Urgent
                          </span>
                        )}
                        {job.flash_post_expires_at && (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-2 py-0.5 text-[11px] font-bold text-white">
                              <Zap className="h-3 w-3" />
                              Boosted
                            </span>
                            <PerkCountdown expiresAt={job.flash_post_expires_at} />
                          </>
                        )}
                        <span
                          title={`Completing this job pays out +${COMPLETION_XP_REWARD} XP and +${COMPLETION_TOKEN_REWARD} Tokens, on top of the ₹${Number(job.budget).toLocaleString("en-IN")} budget`}
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"
                        >
                          <Coins className="h-3 w-3" />
                          +{COMPLETION_TOKEN_REWARD} on completion
                        </span>
                      </div>
                      <h2 className="mt-2 text-lg font-black leading-snug text-slate-900 dark:text-white">{job.title}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {formatApplicationWindow(job.application_deadline) && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Clock className="h-3 w-3" />
                            {formatApplicationWindow(job.application_deadline)}
                          </span>
                        )}
                        {job.estimated_duration && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Calendar className="h-3 w-3" />
                            Est. {job.estimated_duration}
                          </span>
                        )}
                        {formatExperience(job) && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#1B3FAB]/15 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 text-xs font-semibold text-[#1B3FAB] dark:text-blue-400">
                            <Clock className="h-3 w-3" />
                            {formatExperience(job)}
                          </span>
                        )}
                        {formatEducation(job) && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#1B3FAB]/15 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 text-xs font-semibold text-[#1B3FAB] dark:text-blue-400">
                            <GraduationCap className="h-3 w-3" />
                            {formatEducation(job)}
                          </span>
                        )}
                      </div>
                      {job.required_skills?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.required_skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800">
                              {skill}
                            </span>
                          ))}
                          {job.required_skills.length > 4 && (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              +{job.required_skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {job.description || "No further details were added to this post."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Applicants</p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                        <Users className="h-3.5 w-3.5" />
                        {job.applicant_count ?? 0}
                      </p>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Posted</p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                        <Clock3 className="h-3.5 w-3.5" />
                        {timeAgo(job.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedJob(job);
                      }}
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-300 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      disabled={alreadyApplied}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedJob(job);
                      }}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold shadow-md transition-all duration-300 ${
                        alreadyApplied
                          ? "cursor-not-allowed bg-slate-200 text-slate-400 dark:text-slate-500 shadow-none dark:bg-slate-800"
                          : "bg-[#FF6B35] text-white shadow-orange-200 hover:-translate-y-0.5 hover:bg-[#e95c25] hover:shadow-lg"
                      }`}
                    >
                      {alreadyApplied ? "Applied" : "Apply Now"}
                    </button>
                  </div>
                </motion.article>
              );
            })}
              </div>
            )}
          </div>
      </section>

      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={handleProceedToQuiz}
        applying={false}
        applyError=""
        alreadyApplied={selectedJob ? appliedProjectIds.has(selectedJob.id) : false}
      />

      {quizJob && (
        <Suspense fallback={<SuspenseFallback fullScreen={false} />}>
          <ApplicationQuizModal
            open
            submitting={applying}
            onSubmitAnswered={() => submitApplication(true)}
            onSkip={() => submitApplication(false)}
            onCancel={() => {
              if (applying) return;
              setQuizJob(null);
              setPendingMessage("");
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
