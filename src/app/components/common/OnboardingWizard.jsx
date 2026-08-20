import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Plus, X, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { updateOwnProfile } from "../../lib/profilesApi";
import { ApiError } from "../../lib/apiClient";
import ThemeToggle from "../shared/ThemeToggle";

const INPUT_CLASSES =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function ProgressBar({ stepIndex, totalSteps }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-[#FF6B35]"
            initial={false}
            animate={{ width: index <= stepIndex ? "100%" : "0%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      ))}
    </div>
  );
}

function StepShell({ title, subtitle, children }) {
  return (
    <div>
      <h2
        className="text-2xl font-extrabold text-slate-900 dark:text-white"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {title}
      </h2>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>
      <input {...props} className={INPUT_CLASSES} />
    </div>
  );
}

function StepBasics({ data, onChange }) {
  return (
    <StepShell title="Tell us about yourself" subtitle="This is what shows up on your profile.">
      <div className="space-y-4">
        <Field label="Full Name" value={data.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Your full name" />
        <Field
          label="Professional Title"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder='e.g. "Senior React Developer"'
        />
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Bio</label>
          <textarea
            rows={4}
            value={data.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="A couple of sentences about your experience and what you're looking for."
            className={`resize-none ${INPUT_CLASSES}`}
          />
        </div>
      </div>
    </StepShell>
  );
}

// A dynamic tag input over the same real profile.skills array the job
// filters (JobFilters.jsx), profile pages, and job cards all already read
// from — nothing new invented, just a friendlier way to fill it in early.
function SkillInput({ skills, onAdd, onRemove }) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const value = draft.trim();
    if (!value || skills.includes(value)) {
      setDraft("");
      return;
    }
    onAdd(value);
    setDraft("");
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Skills</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="e.g. React"
          className={INPUT_CLASSES}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition active:scale-[0.98] dark:bg-white dark:text-slate-900"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {skill}
              <button
                type="button"
                onClick={() => onRemove(skill)}
                aria-label={`Remove ${skill}`}
                className="text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Worker-only (see the steps array in OnboardingWizard below) — degree/
// university map to the same {degree, school, year} shape
// WorkerShareableProfile.jsx's Education section already reads.
// yearsOfExperience is a genuinely new profile.* key (the flexible JSONB
// column schema.sql already documents as "role-specific extras"), not a
// new table — there's no equivalent field anywhere on a worker's own
// profile today, only on a job POSTING's requirements.
function StepQualifications({ data, onChange }) {
  return (
    <StepShell title="Education & experience" subtitle="Helps businesses see you're qualified at a glance.">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Latest Degree"
            value={data.degree}
            onChange={(e) => onChange({ degree: e.target.value })}
            placeholder='e.g. "B.Tech Computer Science"'
          />
          <Field label="University" value={data.school} onChange={(e) => onChange({ school: e.target.value })} placeholder="e.g. Anna University" />
        </div>
        <Field
          label="Years of Experience"
          type="number"
          min="0"
          value={data.yearsOfExperience}
          onChange={(e) => onChange({ yearsOfExperience: e.target.value })}
          placeholder="e.g. 3"
        />
        <SkillInput
          skills={data.skills}
          onAdd={(skill) => onChange({ skills: [...data.skills, skill] })}
          onRemove={(skill) => onChange({ skills: data.skills.filter((s) => s !== skill) })}
        />
      </div>
    </StepShell>
  );
}

function StepPreferences() {
  return (
    <StepShell title="Set up your dashboard" subtitle="One last thing so it feels like yours.">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Appearance</p>
        <ThemeToggle />
      </div>
    </StepShell>
  );
}

// Real, server-persisted (see migrations/033_onboarding.sql) — mounted
// unconditionally at the bottom of WorkerDashboard.jsx/BusinessDashboard.jsx
// and renders nothing unless has_completed_onboarding is explicitly false.
// Deliberately checks `=== false`, not just falsy — until the migration
// actually runs against production, the column doesn't exist yet and every
// currentUser's copy of it is `undefined`, which must NOT be read as "show
// the wizard to every existing user the moment this deploys."
export default function OnboardingWizard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const isWorker = currentUser?.role === "worker";
  const steps = isWorker ? ["basics", "qualifications", "preferences"] : ["basics", "preferences"];

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    name: currentUser?.name ?? "",
    title: currentUser?.title ?? "",
    bio: currentUser?.profile?.bio ?? "",
    degree: "",
    school: "",
    yearsOfExperience: "",
    skills: currentUser?.profile?.skills ?? [],
  });

  const patch = (fields) => setData((prev) => ({ ...prev, ...fields }));
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleLaunch = async () => {
    setSaving(true);
    setError("");
    try {
      const education = data.degree.trim() || data.school.trim() ? [{ degree: data.degree.trim(), school: data.school.trim() }] : [];
      const updated = await updateOwnProfile({
        name: data.name.trim() || undefined,
        title: data.title.trim() || undefined,
        profilePatch: {
          bio: data.bio.trim(),
          ...(isWorker
            ? {
                education,
                skills: data.skills,
                ...(data.yearsOfExperience !== "" ? { yearsOfExperience: Number(data.yearsOfExperience) } : {}),
              }
            : {}),
        },
        hasCompletedOnboarding: true,
      });
      updateCurrentUser(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save — please try again.");
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleLaunch();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  const handleBack = () => setStepIndex((index) => Math.max(0, index - 1));

  if (currentUser?.has_completed_onboarding !== false) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="border-b border-slate-100 px-8 pb-6 pt-8 dark:border-slate-800">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B35]">
              Welcome to WorkBridge
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Step {stepIndex + 1} of {steps.length}
            </span>
          </div>
          <ProgressBar stepIndex={stepIndex} totalSteps={steps.length} />
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-8 py-8 wb-scroll-clean">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {currentStep === "basics" && <StepBasics data={data} onChange={patch} />}
              {currentStep === "qualifications" && <StepQualifications data={data} onChange={patch} />}
              {currentStep === "preferences" && <StepPreferences />}
            </motion.div>
          </AnimatePresence>

          {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-8 py-6 dark:border-slate-800">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition active:scale-[0.98] disabled:opacity-60 dark:text-slate-400"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition active:scale-[0.98] hover:-translate-y-0.5 hover:bg-[#e85d27] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Launching…
              </>
            ) : isLastStep ? (
              <>
                Launch Dashboard
                <Zap className="h-4 w-4" />
              </>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
