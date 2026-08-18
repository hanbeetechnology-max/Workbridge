import { AnimatePresence, motion } from "motion/react";
import { Check, Flame, GraduationCap, IndianRupee, Tag } from "lucide-react";
import { EDUCATION_LABELS } from "../../utils/educationLevels";

// A single labelled checkbox — shared by the Skills and Education sections
// (skills come from real posted data, education levels from the same fixed
// enum the job cards themselves already render via EDUCATION_LABELS). The
// checkbox itself crossfades color via motion's animate, and the checkmark
// springs in rather than just appearing.
function OptionCheckbox({ label, checked, onToggle }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <motion.span
        animate={{
          backgroundColor: checked ? "#FF6B35" : "#ffffff",
          borderColor: checked ? "#FF6B35" : "#cbd5e1",
        }}
        transition={{ duration: 0.15 }}
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border"
      >
        <AnimatePresence>
          {checked && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
      <span className={`truncate text-sm ${checked ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>{label}</span>
    </motion.button>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
      <p className="text-xs font-bold uppercase tracking-wide text-slate-900 dark:text-white">{label}</p>
    </div>
  );
}

const EDUCATION_LEVELS = Object.entries(EDUCATION_LABELS);

// Hover shadow so a field reads as interactive before it's even focused,
// plus a slower, smoother focus transition. Focus color stays the app's
// usual blue ([#1B3FAB]/blue-100), matching every other text input in the
// app (search bar, composer, etc.) — orange is this app's action/selection
// color (buttons, active pills, checked checkboxes), not its input-focus
// color.
const INPUT_CLASSES =
  "w-full rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none transition-all duration-300 hover:shadow-sm focus:border-[#1B3FAB] focus:bg-white focus:shadow-sm focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800";

// The Job Feed's collapsible filter drawer's content — every option here is
// real, live data (real budgets, the real is_urgent flag, skills pulled
// straight from what businesses actually typed when posting, and the same
// education_level/experience_years fields the job cards' own Qualifications
// chips already read from — see WorkerJobFeed.jsx's
// allSkills/EDUCATION_LABELS). This is deliberately just the four sections
// laid out side by side — WorkerJobFeed.jsx owns the toggle button, the
// open/close animation, and the active-filter count/Clear affordance, since
// those need to stay visible even while this is collapsed.
export default function JobFilters({
  allSkills,
  selectedSkills,
  onToggleSkill,
  budgetRange,
  onBudgetChange,
  urgentOnly,
  onToggleUrgent,
  selectedEducationLevels,
  onToggleEducationLevel,
  yourExperience,
  onExperienceChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <SectionHeader icon={Flame} label="Urgency" />
          <motion.button
            type="button"
            onClick={onToggleUrgent}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              backgroundColor: urgentOnly ? "#FF6B35" : "#f8fafc",
              borderColor: urgentOnly ? "#FF6B35" : "#e2e8f0",
              color: urgentOnly ? "#ffffff" : "#475569",
            }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold shadow-sm"
          >
            <Flame className="h-4 w-4" />
            Urgent only
          </motion.button>
        </div>

        <div>
          <SectionHeader icon={IndianRupee} label="Budget" />
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Min"
                value={budgetRange.min}
                onChange={(event) => onBudgetChange({ ...budgetRange, min: event.target.value })}
                className={`${INPUT_CLASSES} py-2 pl-6 pr-2`}
              />
            </div>
            <span className="flex-shrink-0 text-slate-300 dark:text-slate-600">–</span>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500">₹</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Max"
                value={budgetRange.max}
                onChange={(event) => onBudgetChange({ ...budgetRange, max: event.target.value })}
                className={`${INPUT_CLASSES} py-2 pl-6 pr-2`}
              />
            </div>
          </div>
        </div>

        <div>
          <SectionHeader icon={GraduationCap} label="Qualifications" />

          {/* Worker's own years of experience — checked against each job's
              real min/max_experience_years, not a job-side range, since a
              worker only ever has one number to give. */}
          <label className="mt-3 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Your experience (yrs)</label>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="e.g. 3"
            value={yourExperience}
            onChange={(event) => onExperienceChange(event.target.value)}
            className={`${INPUT_CLASSES} mt-1.5 px-3 py-2`}
          />

          <div className="mt-3 max-h-40 space-y-0.5 overflow-y-auto wb-scroll-clean">
            {EDUCATION_LEVELS.map(([value, label]) => (
              <OptionCheckbox
                key={value}
                label={label}
                checked={selectedEducationLevels.includes(value)}
                onToggle={() => onToggleEducationLevel(value)}
              />
            ))}
          </div>
        </div>

        {allSkills.length > 0 && (
          <div>
            <SectionHeader icon={Tag} label={`Skills (${allSkills.length})`} />
            <div className="wb-scroll-clean mt-3 max-h-40 overflow-y-auto">
              {allSkills.map((skill) => (
                <OptionCheckbox
                  key={skill}
                  label={skill}
                  checked={selectedSkills.includes(skill)}
                  onToggle={() => onToggleSkill(skill)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
