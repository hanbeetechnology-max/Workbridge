import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Flame,
  GraduationCap,
  IndianRupee,
  Link2,
  Lock,
  Plus,
  ShieldCheck,
  Star,
  X,
  Zap,
} from "lucide-react";
import LockedCurrencyInput from "../common/LockedCurrencyInput";
import SharedSkillPicker from "../shared/SharedSkillPicker";
import { formatINR, postJobSchema } from "../../utils/formValidation";
import { trackEvent } from "../../lib/analytics";
import { createProject } from "../../lib/projectsApi";
import { submitLink } from "../../lib/submissionsApi";
import { ApiError } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Tech & Development",
  "Design & Creative",
  "Writing & Content",
  "Marketing & Growth",
  "Data & Research",
  "AI & Automation",
  "Finance & Accounting",
  "Legal & Compliance",
  "Operations & Logistics",
  "Video & Animation",
  "Customer Support",
];

// Resolves the same way the real submit does (Date.now() + N days) — just
// for the live "Due <date>" preview text under the input, so what the
// business sees here always matches what actually gets saved.
function resolveDeadlinePreview(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Style helpers ─────────────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB] transition-colors dark:bg-slate-800 dark:border-slate-700 dark:placeholder-slate-500";

const currencyInputCls =
  "w-full pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-[#0F172A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB] transition-colors dark:bg-slate-800 dark:border-slate-700";

function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
      {children}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-semibold text-red-500 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

function SectionCard({ icon: Icon, title, sub, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#1B3FAB] dark:text-blue-400" />
        </div>
        <div>
          <h2
            className="font-bold text-[#0F172A] dark:text-white text-sm font-display"
          >
            {title}
          </h2>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function BusinessPostJob({ onVerify, isVerified, onJobPosted }) {
  const { currentUser } = useAuth();
  const [urgent, setUrgent] = useState(false);
  const [refLinks, setRefLinks] = useState([""]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(postJobSchema),
    defaultValues: {
      title: "",
      category: "Tech & Development",
      tier: "Professional",
      brief: "",
      skills: [],
      durationDays: 14,
      budget: 30000,
      applicationWindow: 7,
      minExperienceYears: "",
      maxExperienceYears: "",
      educationLevel: "ANY",
      educationNotes: "",
    },
  });

  const rawBudget = Number(watch("budget")) || 0;
  // Budget used to be two fields — a tier dropdown that silently overwrote
  // this one, plus this real number. One fixed, real budget field now.
  const summaryBudget = rawBudget;

  const watchedTitle = watch("title");
  const watchedCategory = watch("category");
  const watchedBrief = watch("brief");
  const watchedSkills = watch("skills");
  const watchedDurationDays = Number(watch("durationDays")) || 0;
  const watchedMinExp = watch("minExperienceYears");
  const watchedMaxExp = watch("maxExperienceYears");
  const watchedEducationLevel = watch("educationLevel");
  const EDUCATION_LABELS = {
    ANY: null,
    HIGH_SCHOOL: "High School",
    DIPLOMA: "Diploma",
    BACHELORS: "Bachelor's",
    MASTERS: "Master's",
    PHD: "PhD",
  };
  const experienceLabel =
    watchedMinExp && watchedMaxExp
      ? `${watchedMinExp}-${watchedMaxExp} yrs`
      : watchedMinExp
        ? `${watchedMinExp}+ yrs`
        : watchedMaxExp
          ? `Up to ${watchedMaxExp} yrs`
          : null;

  // Only title/description/budget/deadline map to the real `projects` table
  // (schema has no category/tier/skills/urgent columns) — skills are folded
  // into the description text rather than silently dropped. Posting
  // (workerId omitted) creates a real OPEN project — it goes live on the
  // public Job Feed immediately, no forced "pick a worker" step. A specific
  // worker can still be brought in later, either through their own
  // application or a direct "Invite to Job" from Find Workers.
  const onSubmit = async (formData) => {
    setPosting(true);
    setPostError("");
    try {
      trackEvent("JobPosted", { category: watchedCategory, budget: summaryBudget });

      const requiredSkills = formData.skills.length > 0 ? formData.skills.slice(0, 20) : undefined;

      // One input, two derived facts — the deadline (a real date) and the
      // duration shown to workers now always agree, since they're computed
      // from the same number instead of being typed in separately.
      const days = Number(formData.durationDays);
      const deadlineDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const estimatedDuration = `${days} Day${days === 1 ? "" : "s"}`;

      const project = await createProject({
        title: formData.title,
        description: formData.brief,
        budget: summaryBudget,
        deadline: deadlineDate,
        applicationWindow: formData.applicationWindow || undefined,
        estimatedDuration,
        minExperienceYears: formData.minExperienceYears || undefined,
        maxExperienceYears: formData.maxExperienceYears || undefined,
        educationLevel: formData.educationLevel || undefined,
        educationNotes: formData.educationNotes || undefined,
        requiredSkills,
        // Explicitly appended, not left to silently drop — see
        // migrations/019_urgent_matching.sql for what this actually does now.
        isUrgent: urgent,
      });

      const referenceLinks = refLinks.map((link) => link.trim()).filter(Boolean);
      if (referenceLinks.length > 0) {
        await Promise.allSettled(
          referenceLinks.map((url) =>
            submitLink({ projectId: project.id, url, caption: "Reference material shared at posting time" })
          )
        );
      }

      onJobPosted?.(project);
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : "Could not post this job.");
    } finally {
      setPosting(false);
    }
  };

  // Reference link helpers
  const addRefLink = () => {
    if (refLinks.length < 5) setRefLinks((prev) => [...prev, ""]);
  };
  const removeRefLink = (idx) =>
    setRefLinks((prev) => prev.filter((_, i) => i !== idx));
  const updateRefLink = (idx, value) =>
    setRefLinks((prev) => prev.map((v, i) => (i === idx ? value : v)));

  if (!isVerified) {
    return <PostJobGate onVerify={onVerify} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-7 wb-tab-enter dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">

        {/* Page Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-display"
          >
            Post a New Job
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Your payment is held securely and only released after you approve the work.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* ── Left Column: Form Wizard ─────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Card 1: Basic Details */}
              <SectionCard
                icon={Briefcase}
                title="Job Details"
                sub="Set the job title and category"
              >
                <div>
                  <FieldLabel>Job Title</FieldLabel>
                  <input
                    type="text"
                    placeholder="e.g. React Developer for Analytics Dashboard"
                    {...register("title", { setValueAs: (v) => v.trim() })}
                    className={inputCls}
                  />
                  <FieldError message={errors.title?.message} />
                </div>

                <div>
                  {/* A real dropdown, strictly enforcing CATEGORIES — used
                      to be a free-text combobox that only *suggested* these
                      values, so nothing stopped "tech" / "Tech" / a typo
                      from all landing as different categories. */}
                  <FieldLabel>Category</FieldLabel>
                  <div className="relative">
                    <select {...register("category")} className={`${inputCls} appearance-none pr-10`}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  <FieldError message={errors.category?.message} />
                </div>
              </SectionCard>

              {/* Card 2: Project Brief & Requirements */}
              <SectionCard
                icon={FileText}
                title="Project Brief & Requirements"
                sub="Describe scope, deliverables, and required skills"
              >
                <div>
                  <FieldLabel>Project Brief</FieldLabel>
                  <textarea
                    rows={5}
                    placeholder="Describe scope, deliverables, and key requirements..."
                    {...register("brief", { setValueAs: (v) => v.trim() })}
                    className={`${inputCls} resize-none`}
                  />
                  <FieldError message={errors.brief?.message} />
                </div>

                <div>
                  <FieldLabel>Required Skills</FieldLabel>
                  <SharedSkillPicker
                    selectedSkills={watchedSkills}
                    onChange={(skills) => setValue("skills", skills, { shouldValidate: true })}
                    placeholder="Search or add a skill…"
                  />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    Short tags only — longer requirements (Agile process, cloud experience, etc.) belong in the Project Brief above.
                  </p>
                  <FieldError message={errors.skills?.message} />
                </div>
              </SectionCard>

              {/* Card 2b: Qualifications — real experience/education fields,
                  not text buried in the brief. */}
              <SectionCard
                icon={GraduationCap}
                title="Qualifications"
                sub="Experience and education you actually require — shown as real filters on your listing"
              >
                <div>
                  <FieldLabel>Experience Required (Years)</FieldLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        placeholder="Min, e.g. 3"
                        {...register("minExperienceYears")}
                        className={inputCls}
                      />
                      <FieldError message={errors.minExperienceYears?.message} />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        placeholder="Max, e.g. 6 (optional)"
                        {...register("maxExperienceYears")}
                        className={inputCls}
                      />
                      <FieldError message={errors.maxExperienceYears?.message} />
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Leave both blank if experience level doesn't matter.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Minimum Education</FieldLabel>
                    <select {...register("educationLevel")} className={inputCls}>
                      <option value="ANY">No requirement</option>
                      <option value="HIGH_SCHOOL">High School</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="BACHELORS">Bachelor's Degree</option>
                      <option value="MASTERS">Master's Degree</option>
                      <option value="PHD">PhD</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Education Notes (Optional)</FieldLabel>
                    <input
                      type="text"
                      placeholder='e.g. "Computer Science or equivalent"'
                      {...register("educationNotes", { setValueAs: (v) => v.trim() })}
                      className={inputCls}
                    />
                    <FieldError message={errors.educationNotes?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* Card 3: Budget & Timeline */}
              <SectionCard
                icon={Clock}
                title="Budget & Timeline"
                sub="Set your project budget and how long the worker has to complete it"
              >
                {/* WorkBridge runs on escrow exclusively — no hourly
                    billing exists, so this isn't a setting to look for
                    elsewhere on the page. Read-only, explains itself. */}
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400">
                  🔒 Fixed Price Escrow
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  WorkBridge is fixed-price only — the full budget below is held in escrow and released to the worker once you approve the delivered work. There's no hourly billing to switch to.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Project Duration (Days)</FieldLabel>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      step="1"
                      placeholder="e.g. 14"
                      {...register("durationDays")}
                      className={inputCls}
                    />
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                      {watchedDurationDays > 0
                        ? `Due ${resolveDeadlinePreview(watchedDurationDays)} — this is the one deadline workers see.`
                        : "How many days does the worker have to deliver, once they start?"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Maximum 365 days.</p>
                    <FieldError message={errors.durationDays?.message} />
                  </div>
                  <div>
                    <FieldLabel>Budget (₹)</FieldLabel>
                    <LockedCurrencyInput
                      value={rawBudget || ""}
                      onChange={(value) =>
                        setValue("budget", value, { shouldValidate: true })
                      }
                      max="5000000"
                      inputClassName={currencyInputCls}
                    />
                    {rawBudget === 0 && (
                      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                        Enter a budget to see the deposit total
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Maximum ₹50,00,000.</p>
                    <FieldError message={errors.budget?.message} />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel>Application Window (Days)</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    step="1"
                    placeholder="e.g. 7"
                    {...register("applicationWindow")}
                    className={`${inputCls} sm:w-1/2`}
                  />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">How long this post stays open to new applicants — separate from the project duration above.</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Maximum 90 days.</p>
                  <FieldError message={errors.applicationWindow?.message} />
                </div>

                {/* Urgent toggle — real effect now: is_urgent persists and
                    the Job Board actually sorts/gates on it (see
                    projects.repository.js's listOpen). Copy describes only
                    what actually happens — no fabricated "2-hour response"
                    promise, no subscription-tier claim (deferred). */}
                <div
                  className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                    urgent ? "border-[#FF6B35]/40 bg-orange-50 dark:bg-orange-500/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-[#FF6B35]/10" : "bg-white dark:bg-slate-700"}`}>
                      <Flame className={`h-4 w-4 ${urgent ? "text-[#FF6B35]" : "text-slate-400 dark:text-slate-500"}`} />
                    </span>
                    <div>
                      <div className={`text-sm font-bold ${urgent ? "text-[#0F172A] dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>Urgent Matching</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Sorts to the top of the Job Board; Silver-tier+ workers see it immediately, others after 3 hours.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={urgent}
                    aria-label="Urgent Matching"
                    onClick={() => setUrgent(!urgent)}
                    className={`relative ml-4 h-6 w-12 flex-shrink-0 rounded-full transition-colors duration-200 ${
                      urgent ? "bg-[#FF6B35]" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        urgent ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </SectionCard>

              {/* Card 4: Reference Materials */}
              <SectionCard
                icon={Link2}
                title="Reference Materials"
                sub="Add links, docs, or videos to help workers understand the task"
              >
                <div className="space-y-3">
                  {refLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex items-center gap-2 flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-[#1B3FAB]/20 focus-within:border-[#1B3FAB] transition-colors dark:bg-slate-800 dark:border-slate-700">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => updateRefLink(idx, e.target.value)}
                          placeholder="https://drive.google.com/… or YouTube link, Figma, Notion…"
                          className="flex-1 bg-transparent text-sm text-[#0F172A] dark:text-white placeholder-slate-400 outline-none"
                        />
                      </div>
                      {refLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRefLink(idx)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {refLinks.length < 5 && (
                    <button
                      type="button"
                      onClick={addRefLink}
                      className="flex items-center gap-2 text-xs font-bold text-[#1B3FAB] dark:text-blue-400 hover:text-[#1635A0] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add another reference
                    </button>
                  )}
                </div>

                {/* Privacy notice */}
                <div className="flex items-start gap-2.5 p-4 bg-blue-50 border border-blue-100 rounded-xl mt-2 dark:bg-blue-500/10 dark:border-blue-900/40">
                  <Eye className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-400">Private by default</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-0.5 leading-relaxed">
                      Workers will <strong>not</strong> see these links when browsing job listings.
                      Once someone is assigned to this job, each link is sent for a quick WorkBridge review before
                      it's shared with them — the same check every submitted file goes through.
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ── Right Column: Sticky Sidebar ─────────────────── */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">

                {/* ── Job Preview Card (styled exactly like WorkerJobFeed) — the
                    outer chrome adapts to the business's theme, but the inner
                    `article` below stays a fixed light card on purpose: it's
                    a preview of what a worker sees, not this business's own
                    page. */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
                    >
                      Preview
                    </h3>
                    {/* <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full dark:bg-emerald-500/10 dark:border-emerald-900/40 dark:text-emerald-400">
                      Live
                    </span> */}
                  </div>

                  {/* ── The actual preview card — mirrors WorkerJobFeed article ── */}
                  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 truncate dark:text-slate-500">
                          {watchedCategory || "Category"}
                        </p>
                        <h2
                          className="mt-1.5 text-sm font-black leading-snug text-slate-900 dark:text-white font-display"
                        >
                          {watchedTitle || (
                            <span className="text-slate-300 font-normal dark:text-slate-600">Your job title…</span>
                          )}
                        </h2>
                      </div>
                      <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    {/* Business + Budget chips — real data, not a placeholder
                        company name, since this is a preview of what the
                        current logged-in business's own post looks like. */}
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        <Briefcase className="h-3 w-3" />
                        {currentUser?.profile?.companyName || currentUser?.name || "Your business"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                        <IndianRupee className="h-3 w-3" />
                        {summaryBudget > 0 ? `₹${summaryBudget.toLocaleString("en-IN")}` : "Budget"}
                      </span>
                    </div>

                    {/* Qualifications chips — only real, filled-in
                        requirements show; nothing implies a requirement
                        that wasn't actually set. */}
                    {(experienceLabel || EDUCATION_LABELS[watchedEducationLevel]) && (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-[#1B3FAB] dark:text-blue-400">
                        {experienceLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1">
                            <Clock className="h-3 w-3" />
                            {experienceLabel} exp
                          </span>
                        )}
                        {EDUCATION_LABELS[watchedEducationLevel] && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1">
                            <GraduationCap className="h-3 w-3" />
                            {EDUCATION_LABELS[watchedEducationLevel]}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Brief */}
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {watchedBrief || (
                        <span className="text-slate-300 dark:text-slate-600">Project description will appear here…</span>
                      )}
                    </p>

                    {/* Stats: Applicants | Type | Rating — budget already
                        shown in the chip row above, so this slot shows
                        something a real posted listing will actually have:
                        how many people have applied. Always 0 here since
                        this is an unposted draft. */}
                    <div className="mt-3 grid grid-cols-3 gap-0 rounded-xl border border-slate-200 bg-slate-50 text-center text-[11px] overflow-hidden dark:border-slate-700 dark:bg-slate-800">
                      <div className="py-2.5 px-1">
                        <p className="text-slate-400 dark:text-slate-500">Applicants</p>
                        <p className="mt-0.5 font-black text-slate-900 dark:text-white">0</p>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 border-x border-slate-200 dark:border-slate-700">
                        <p className="text-slate-400 dark:text-slate-500">Type</p>
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400">
                          🔒 Fixed
                        </span>
                      </div>
                      <div className="py-2.5 px-1">
                        <p className="text-slate-400 dark:text-slate-500">Rating</p>
                        {/* Real reviews aren't fetched into this draft-preview
                            component — rather than fabricate a number, this
                            honestly reads "New" until this business has
                            actual reviews to show, same as a worker with
                            zero reviews reads elsewhere on WorkBridge. */}
                        <p className="mt-0.5 font-black text-slate-900 dark:text-white inline-flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                          New
                        </p>
                      </div>
                    </div>

                    {/* Skills tags */}
                    {watchedSkills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {watchedSkills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer row */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        Just now
                      </span>
                      <div className="flex items-center gap-1.5">
                        {urgent && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-400">
                            <Zap className="h-2.5 w-2.5" />
                            Urgent
                          </span>
                        )}
                        {watchedDurationDays > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Due {resolveDeadlinePreview(watchedDurationDays)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dummy CTA — shows workers what they will see */}
                    <div className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-center text-xs font-bold text-slate-400 cursor-default select-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                      View Details (worker view)
                    </div>
                  </article>

                  <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                    This is exactly how workers see your listing
                  </p>
                </div>

                {/* ── Payment Summary + CTA ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#1B3FAB] dark:text-blue-400" />
                    </div>
                    <h3
                      className="text-sm font-bold text-[#0F172A] dark:text-white font-display"
                    >
                      Payment Summary
                    </h3>
                  </div>

                  <div
                    className="space-y-2.5 text-sm mb-5"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] dark:text-white">You'll Deposit</span>
                      <span
                        className="font-extrabold text-[#FF6B35] text-base font-display"
                      >
                        {formatINR(summaryBudget)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-5 dark:bg-slate-800 dark:border-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Your job goes live on the Job Feed right away so any worker can apply — funds are only held once you
                      accept someone, and released after you approve the delivered work. You can also invite a specific
                      worker directly from Find Workers at any time while it's open.
                    </p>
                  </div>

                  {postError && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{postError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={posting}
                    className="w-full py-4 bg-[#FF6B35] hover:bg-[#E55E1F] text-white rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B35]/30 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 font-display"
                  >
                    {posting ? "Posting…" : "Post Job — Go Live"}
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}

// ── Verification Gate ─────────────────────────────────────────────────────
// DO NOT MODIFY: gates unverified businesses from posting jobs.
function PostJobGate({ onVerify }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center min-h-[80vh] wb-tab-enter dark:bg-slate-950">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-orange-50 border-2 border-orange-100 rounded-3xl flex items-center justify-center dark:bg-orange-500/10 dark:border-orange-900/40">
          <Lock className="w-10 h-10 text-[#FF6B2C]" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#FF6B2C] rounded-full flex items-center justify-center shadow-md shadow-orange-200">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>

      <h2
        className="text-2xl font-extrabold text-[#0A1128] dark:text-white mb-3 font-display"
      >
        Verify your business first
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
        You need to verify your business before you can post jobs on WorkBridge.
        It's a <strong className="text-slate-700 dark:text-slate-200">one-time process</strong> that protects freelancers
        and keeps the platform limited to real, legitimate companies.
      </p>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 max-w-sm w-full mb-8 shadow-sm text-left space-y-3 dark:bg-slate-900 dark:border-slate-800">
        {[
          { emoji: "Shield", text: "Keeps fake and fraudulent job listings off the platform" },
          { emoji: "Trust", text: "Gives freelancers a reason to trust your listing" },
          { emoji: "Launch", text: "Lets you post as many jobs as you want" },
          { emoji: "Fast", text: "One-time check, done in minutes" },
        ].map(({ emoji, text }, i) => (
          <div
            key={text}
            className="flex items-center gap-3 wb-card-enter"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-xs font-bold text-[#FF6B2C] flex-shrink-0">{emoji}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onVerify}
        className="flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-[#FF6B2C] to-rose-500 text-white rounded-2xl font-bold text-base shadow-xl shadow-orange-200 hover:opacity-90 hover:-translate-y-1 transition-all duration-200 group font-display"
      >
        <CheckCircle2 className="w-5 h-5" />
        Verify My Business
        <span className="text-white/70 text-sm font-normal">Free</span>
      </button>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
        Lifetime verified status - Completely free - Review in 24-48 hrs
      </p>
    </div>
  );
}
