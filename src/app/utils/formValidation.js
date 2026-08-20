import { z } from "zod";

export const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value) {
  return inrFormatter.format(Number(value) || 0);
}

// Real profiles have no stored avatar initials (unlike the old mock `av`
// field) — derived client-side from the display name wherever an avatar
// image isn't set. The `= ""` default only covers a missing argument, not
// an explicit `null` (e.g. an unassigned project's worker_name from a LEFT
// JOIN) — `|| ""` catches that too, where a plain default param can't.
export function getInitials(name) {
  return (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
}

export const cleanText = z
  .string()
  .trim()
  .min(2, "Must be at least 2 characters");

export const cleanLongText = z
  .string()
  .trim()
  .min(2, "Must be at least 2 characters");

export const phoneSchema = z
  .string()
  .regex(/^\d{10}$/, "Enter exactly 10 numeric digits");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address");

export const positiveCurrencySchema = z.coerce
  .number()
  .finite("Enter a valid amount")
  .min(0, "Amount cannot be negative");

export const integerSchema = z.coerce
  .number()
  .int("Enter a whole number")
  .min(0, "Value cannot be negative");

export const authSchema = z.object({
  fullName: z.string().optional(),
  email: emailSchema,
  // Phone remains required for account creation, but is optional on sign-in
  // so internally provisioned admins (whose phone can be null) can use the
  // same shared authentication form as every other account.
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = authSchema.extend({
  fullName: cleanText,
  phone: phoneSchema,
  agreedToTerms: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Terms & Conditions and Privacy Policy to continue.",
  }),
});

export const adminAuthSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// A "skill" is meant to be a short tag ("React", "Node.js"), not a
// sentence — this caps how many words one comma-separated entry can have.
const MAX_SKILL_WORDS = 5;

export const postJobSchema = z
  .object({
    title: cleanText,
    category: cleanText,
    tier: cleanText,
    brief: cleanLongText,
    // A real array of short tags now (SharedSkillPicker.jsx), not a
    // comma-separated string a user could type anything into — see
    // SharedSkillPicker's own comment for why free text broke matching.
    skills: z.array(z.string()).default([]),
    // Deadline and "Estimated Project Duration" used to be two separate,
    // easy-to-contradict inputs (pick a calendar date, then also type a
    // free-text duration that had no real relationship to it). One number
    // now drives both — the deadline (a real date, resolved at submit
    // time) and the duration shown to workers are the same fact.
    durationDays: z.coerce
      .number()
      .int("Enter a whole number of days")
      .min(1, "Must be at least 1 day")
      .max(365, "Keep it to 365 days or fewer"),
    // positiveCurrencySchema alone only rejects negative amounts — nothing
    // stopped a stray extra zero (or twelve) from being posted as a real
    // job budget. 50 lakh is generously above anything real seen on this
    // platform (typical budgets run ₹500–₹90,000) while still catching
    // fat-finger typos, not enforcing a tight business policy ceiling.
    budget: positiveCurrencySchema.max(5000000, "Keep the budget under ₹50,00,000 — contact support for anything larger"),
    applicationWindow: z.coerce
      .number()
      .int("Enter a whole number of days")
      .min(1, "Must be at least 1 day")
      .max(90, "Keep it to 90 days or fewer")
      .optional(),
    // Real, structured job requirements — Required Skills (above) used to
    // just get folded into the brief text; experience/education had no
    // representation at all. See migrations/018_job_qualifications.sql.
    minExperienceYears: z.coerce.number().int().min(0).max(60).optional().or(z.literal("").transform(() => undefined)),
    maxExperienceYears: z.coerce.number().int().min(0).max(60).optional().or(z.literal("").transform(() => undefined)),
    educationLevel: z.enum(["ANY", "HIGH_SCHOOL", "DIPLOMA", "BACHELORS", "MASTERS", "PHD"]).optional(),
    educationNotes: z.string().max(300, "Keep it short, e.g. \"Computer Science or equivalent\"").optional(),
  })
  .refine(
    (data) =>
      data.maxExperienceYears === undefined ||
      data.minExperienceYears === undefined ||
      data.maxExperienceYears >= data.minExperienceYears,
    { message: "Max experience must be ≥ min experience.", path: ["maxExperienceYears"] }
  )
  // Required Skills is a list of short tags, not full sentences — a
  // freehand chip typed straight from a job description could still slip
  // a whole paragraph in as "one skill." Mirrors the backend's own cap
  // (projects.validators.js).
  .refine(
    (data) => data.skills.every((s) => s.split(/\s+/).filter(Boolean).length <= MAX_SKILL_WORDS),
    {
      message: `Each skill must be ${MAX_SKILL_WORDS} words or fewer — looks like a full sentence got in there. Keep skills short (e.g. "React", "Node.js"); put longer requirements in the Project Brief instead.`,
      path: ["skills"],
    }
  );
