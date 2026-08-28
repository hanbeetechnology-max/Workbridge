import { useState } from "react";
import {
  AlertCircle,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import EditableCoverPhoto from "../shared/EditableCoverPhoto";
import ShareProfileButton from "../shared/ShareProfileButton";
import { useAuth } from "../../context/AuthContext";
import { updateOwnProfile } from "../../lib/profilesApi";
import { ApiError } from "../../lib/apiClient";
import { INDIAN_CITIES } from "../../lib/indianCities";
import { getInitials } from "../../utils/formValidation";
import { yearFilter, businessNameFilter } from "../../utils/inputGuards";

// ── Static data ───────────────────────────────────────────────────────────────
// name/initials here are only the fallback for a business that hasn't set a
// real company name yet (see updateOwnProfile's profilePatch.companyName
// below) — everything else on this page (tagline/industry/bio/culture/etc.)
// is still local-only mock content, unconnected to any real account.

const INITIAL_PROFILE = {
  name: "RetailX Pvt Ltd",
  initials: "RX",
  coverImage: "",
  tagline: "India's fastest-growing D2C e-commerce enabler",
  industry: "E-Commerce Technology",
  location: "Mumbai, India",
  size: "51–200 employees",
  founded: "2019",
  website: "https://retailx.in",
  email: "hr@retailx.in",
  bio: "RetailX is India's fastest-growing D2C e-commerce enabler, powering 500+ brands with end-to-end technology solutions — from inventory management and payment processing to last-mile logistics. We work with brands across fashion, food, electronics, and lifestyle at every stage from seed to Series C.",
  culture:
    "We move fast, ship often, and believe in outcome-driven work. Our team spans 12 cities across India — remote-first, async-friendly, and deeply collaborative. Workers are embedded into our squads and treated as core team members for the full duration of the project.",
};

const COMPANY_JOBS = [
  { id: "j1", title: "AI Chatbot for Customer Support", tier: "Professional", budget: "₹22,000", workload: "Full-time · 1 month", urgent: true, posted: "2 days ago" },
  { id: "j2", title: "React Analytics Dashboard", tier: "Standard", budget: "₹12,000", workload: "Part-time · 2 weeks", urgent: false, posted: "5 days ago" },
  { id: "j3", title: "SEO Audit & Content Strategy", tier: "Micro", budget: "₹5,000", workload: "Flexible · 1 week", urgent: false, posted: "1 week ago" },
];

const WORKER_REVIEWS = [
  {
    id: 1, name: "Priya Sharma", initials: "PS", bg: "bg-[#1B3FAB]", rating: 5,
    role: "Full-Stack Developer", project: "E-Commerce Platform Dev",
    text: "RetailX were excellent communicators throughout — clear requirements, fast approvals, and payment released within hours of delivery. One of the best clients on WorkBridge.",
    date: "Jun 28, 2026",
  },
  {
    id: 2, name: "Arjun Mehta", initials: "AM", bg: "bg-[#1B3FAB]", rating: 5,
    role: "UI/UX Designer", project: "Brand Identity Design",
    text: "Smooth experience from brief to delivery. They knew exactly what they wanted and gave clear feedback at every milestone. Would happily work with them again.",
    date: "Jul 1, 2026",
  },
  {
    id: 3, name: "Rohit Verma", initials: "RV", bg: "bg-emerald-600", rating: 4,
    role: "Content & SEO Specialist", project: "SEO Content – 20 Articles",
    text: "Great brief, quick responses. Scope was crystal-clear from day one. Minor delay in milestone approvals but overall a solid, professional client.",
    date: "Jul 2, 2026",
  },
];

const VERIFICATIONS = [
  { label: "GST Certificate",      ok: true  },
  { label: "Company PAN",          ok: true  },
  { label: "Director Aadhaar",     ok: true  },
  { label: "Premium Membership",   ok: true  },
  { label: "Business Bank Account", ok: false },
];

const STATS = [
  { label: "Jobs Posted",    value: "42",   Icon: Briefcase,  color: "text-[#1B3FAB] dark:text-blue-400",   bg: "bg-[#F4F6FF] dark:bg-[#1B3FAB]/10"  },
  { label: "Workers Hired",  value: "28",   Icon: Users,      color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  { label: "Avg. Rating",    value: "4.7",  Icon: Star,       color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10"   },
  { label: "Success Rate",   value: "94%",  Icon: TrendingUp, color: "text-[#FF6B35]",   bg: "bg-orange-50 dark:bg-orange-500/10"  },
];

const CULTURE_TAGS = ["Remote-First", "Async-Friendly", "Outcome-Driven", "Fast-Paced", "Collaborative"];

// ── Sub-components ───────────────────────────────────────────────────────────

function RatingBar({ label, value, total = 28 }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 w-5 flex-shrink-0">{value}</span>
    </div>
  );
}

// ── Profile view ─────────────────────────────────────────────────────────────

function ProfileView({ profile, onEdit, onCoverUpload, coverUploading, coverError }) {
  const shareUrl = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <div className="bg-slate-50 wb-tab-enter dark:bg-slate-950">

      {/* ── Hero ── same structure as WorkerProfile.jsx: one section clips
          the cover photo's top corners via overflow-hidden (full-bleed, no
          inset gap), the identity card overlaps its bottom edge from inside
          a padded content div below it. Capped at max-w-[1200px], same as
          the Body section further down — otherwise the cover spans the
          full page width while everything below it is centered/narrower. */}
      <div className="w-full px-1 pt-1">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        {/* No heightClass override — same default as WorkerProfile.jsx's
            cover (h-40 sm:h-48), so the two pages' banners always match
            instead of drifting out of sync from independent height picks. */}
        <EditableCoverPhoto
          coverUrl={profile.coverImage}
          onUpload={onCoverUpload}
          uploading={coverUploading}
        />
        {coverError && (
          <p className="flex items-center gap-1.5 px-6 pt-3 text-xs font-semibold text-red-500 sm:px-8">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {coverError}
          </p>
        )}

        <div className="px-6 pb-7 sm:px-8">
          {/* Identity card overlaps the bottom of the cover, light theme —
              replacing the old dark-glassmorphism card that sat inside it.
              relative z-10 keeps it painting above the cover photo (a
              positioned element) despite the negative margin pulling it up
              into the same space — see WorkerProfile.jsx for the identical
              stacking-order fix. */}
          <div className="relative z-10 -mt-14 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:flex-row sm:items-start sm:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {/* Company logo */}
              <div className="w-[84px] h-[84px] rounded-2xl bg-white p-[4px] shadow-xl ring-1 ring-slate-200 flex-shrink-0 dark:bg-slate-900 dark:ring-slate-700">
                <div
                  className="w-full h-full bg-[#1B3FAB] rounded-xl flex items-center justify-center text-white font-extrabold text-xl font-display"
                >
                  {profile.initials}
                </div>
              </div>

              {/* Company info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1
                    className="font-extrabold text-[#0F172A] dark:text-white text-xl leading-tight font-display"
                  >
                    {profile.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 flex-shrink-0 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/40">
                    <Award className="w-3 h-3" /> Premium (Preview)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 flex-shrink-0 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40">
                    <ShieldCheck className="w-3 h-3" /> GST Verified (Preview)
                  </span>
                </div>

                <p className="text-slate-500 dark:text-slate-400 text-sm italic mb-2">{profile.tagline}</p>

                {/* Meta chips */}
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                  {[
                    { Icon: Building2, val: profile.industry },
                    { Icon: MapPin,    val: profile.location  },
                    { Icon: Users,     val: profile.size      },
                    { Icon: Calendar,  val: `Est. ${profile.founded}` },
                  ].map(({ Icon, val }) => (
                    <span key={val} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      {val}
                    </span>
                  ))}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[#1B3FAB] dark:text-blue-400 font-semibold hover:underline"
                    >
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      {profile.website.replace("https://", "")}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Bio, merged into the header — no separate "About" card
                    further down the page for HR visitors to hunt for. */}
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio}</p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {/* Explicit className to match Edit Profile's exact size/radius
                  (px-4 py-2.5, rounded-xl) — the component's bare default
                  (px-5 py-3, rounded-lg, no dark: coverage at all) is tuned
                  for the public, always-light /profiles/:id page, not this
                  dark-mode-aware dashboard header, which is why the two
                  buttons visibly mismatched here. */}
              <ShareProfileButton
                url={shareUrl}
                title={profile.name}
                text={`Check out ${profile.name} on WorkBridge`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              />
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B3FAB] px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1635A0] dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="px-7 py-6 w-full">

        {/* STATS/VERIFICATIONS below are illustrative sample data, not yet
            pulled from real activity (job-post counts, real hires, the real
            review-based rating already live via reviewsApi) — honestly
            labeled per the same "real data or clearly-labeled preview"
            rule the rest of this app follows. */}
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Preview mode — the stats and badges below are examples, not your real account data.
          </span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {STATS.map(({ label, value, Icon, color, bg }, i) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5 flex items-center gap-3 wb-card-enter"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${color} leading-none font-display`}>
                  {label === "Avg. Rating"
                    ? <span className="flex items-center gap-1">{value}<Star className="w-4 h-4 fill-amber-400 text-amber-400" /></span>
                    : value
                  }
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT – main content (2/3) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Culture */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 font-display">Culture &amp; Work Style</h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{profile.culture}</p>
              <div className="flex flex-wrap gap-2">
                {CULTURE_TAGS.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 text-[#1B3FAB] dark:text-blue-400 text-xs font-semibold rounded-full border border-[#1B3FAB]/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Current Openings */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-display">Current Openings (Preview)</h2>
                <span className="text-xs font-bold text-[#1B3FAB] dark:text-blue-400 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 rounded-full border border-[#1B3FAB]/10">
                  {COMPANY_JOBS.length} Open
                </span>
              </div>
              <div className="space-y-3">
                {COMPANY_JOBS.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-[#F4F6FF] hover:border-[#1B3FAB]/20 transition-all group cursor-pointer dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-[#1B3FAB]/10"
                  >
                    <div className="w-10 h-10 bg-[#1B3FAB] rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 font-display">
                      {profile.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate group-hover:text-[#1B3FAB] dark:group-hover:text-blue-400 transition-colors">{job.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{job.tier} · {job.workload} · Posted {job.posted}</p>
                    </div>
                    {job.urgent && (
                      <span className="flex-shrink-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-500/10 dark:border-red-900/40">
                        Urgent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Worker Reviews */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-display">Worker Reviews (Preview)</h2>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">4.7</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">(sample)</span>
                </div>
              </div>

              {/* Rating breakdown */}
              <div className="bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-4 mb-5 space-y-2.5">
                <RatingBar label="5 ★" value={22} />
                <RatingBar label="4 ★" value={4}  />
                <RatingBar label="3 ★" value={1}  />
                <RatingBar label="2 ★" value={1}  />
                <RatingBar label="1 ★" value={0}  />
              </div>

              {/* Review cards */}
              <div className="space-y-4">
                {WORKER_REVIEWS.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Avatar initials={rev.initials} bg={rev.bg} size="w-9 h-9" text="text-xs" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-bold text-[#0F172A] dark:text-white text-sm">{rev.name}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{rev.role}</span>
                          <div className="ml-auto flex gap-0.5 flex-shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-[#1B3FAB] dark:text-blue-400 mb-1.5">{rev.project}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rev.text}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">{rev.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT – sidebar (1/3) */}
          <div className="space-y-5">

            {/* Company Details */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 font-display">Company Details</h3>
              <div className="space-y-4">
                {[
                  { Icon: Building2, label: "Industry",  val: profile.industry },
                  { Icon: MapPin,    label: "Location",  val: profile.location  },
                  { Icon: Users,     label: "Team Size", val: profile.size      },
                  { Icon: Calendar,  label: "Founded",   val: profile.founded   },
                ].map(({ Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-white mt-0.5">{val}</p>
                    </div>
                  </div>
                ))}
                {profile.website && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Website</p>
                      <a href={profile.website} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-semibold text-[#1B3FAB] dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                        {profile.website.replace("https://", "")}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Contact Email</p>
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-white mt-0.5">{profile.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trust & Verification */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 font-display">Trust &amp; Verification (Preview)</h3>
              <div className="space-y-3">
                {VERIFICATIONS.map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-900/40" : "bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}>
                      <CheckCircle2 className={`w-3 h-3 ${ok ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
                    </div>
                    <span className={`text-sm flex-1 ${ok ? "font-semibold text-[#0F172A] dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                      {label}
                    </span>
                    {!ok && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-900/40">
                        Pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Verified &amp; trusted employer</span>
              </div>
            </div>

            {/* Premium benefits */}
            <div className="rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-900/40">
              <div className="bg-gradient-to-r from-amber-500 to-[#FF6B35] px-5 py-3.5 flex items-center gap-2">
                <Award className="w-4 h-4 text-white flex-shrink-0" />
                <span className="font-extrabold text-white text-sm font-display">
                  Premium Employer
                </span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 px-5 py-4">
                <ul className="space-y-2.5">
                  {[
                    "Priority listing on worker job feed",
                    "Early access to top-rated talent",
                    "Dedicated account manager",
                    "Analytics dashboard access",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-amber-800 dark:text-amber-400">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Edit CTA */}
            <button
              onClick={onEdit}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1B3FAB] text-white rounded-2xl text-sm font-bold hover:bg-[#1635A0] hover:-translate-y-0.5 transition-all duration-200 shadow-md shadow-[#1B3FAB]/20 dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:shadow-[#1B3FAB]/10 dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]"
            >
              <Edit3 className="w-4 h-4" />
              Edit Company Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ draft, onChange, onSave, onCancel, saving, saveError }) {
  const { currentUser, setShowVerificationFrame } = useAuth();
  const isVerified = Boolean(currentUser?.verified);
  const frameShown = currentUser?.showVerificationFrame !== false;
  return (
    <div className="wb-scroll-clean h-full min-h-0 overflow-y-auto bg-slate-50 p-7 pb-12 wb-tab-enter dark:bg-slate-950">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white font-display">
              Edit Company Profile
            </h1>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Changes visible to workers on your public profile</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} disabled={saving}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-60 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#1B3FAB] text-white rounded-xl text-sm font-bold hover:bg-[#1635A0] transition-all active:scale-[0.98] shadow-md shadow-[#1B3FAB]/20 disabled:opacity-60 dark:bg-gradient-to-r dark:from-[#16327A] dark:to-[#2b52d6] dark:shadow-[#1B3FAB]/10 dark:hover:from-[#1B3FAB] dark:hover:to-[#3a63e0]">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6 sm:p-8">
          <EditFormSection icon={Building2} title="Company Identity">
            <Field label="Company Name">
              <p className="mb-1.5 -mt-1 text-xs text-slate-400 dark:text-slate-500">
                Shown to workers everywhere your job posts appear — separate from your own account name.
              </p>
              <input value={draft.name ?? ""} onChange={(e) => onChange("name", businessNameFilter(e.target.value))}
                placeholder="e.g. RetailX Pvt Ltd"
                className="w-full px-4 py-2.5 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB]" />
            </Field>

            <Field label="Tagline">
              <input value={draft.tagline ?? ""} onChange={(e) => onChange("tagline", e.target.value)}
                maxLength={100} placeholder="One-line description of your company"
                className="w-full px-4 py-2.5 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB]" />
            </Field>

            <Field label="Header Image">
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <EditableCoverPhoto
                  coverUrl={draft.coverImage}
                  onUpload={(dataUrl) => onChange("coverImage", dataUrl)}
                  heightClass="h-[clamp(180px,22vh,260px)]"
                />
              </div>
            </Field>
          </EditFormSection>

          <EditFormSection icon={FileText} title="About">
            <Field label="Company Bio">
              <textarea rows={4} value={draft.bio} onChange={(e) => onChange("bio", e.target.value)}
                className="w-full px-4 py-3 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB] resize-none" />
            </Field>

            <Field label="Culture & Work Style">
              <textarea rows={3} value={draft.culture} onChange={(e) => onChange("culture", e.target.value)}
                className="w-full px-4 py-3 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB] resize-none" />
            </Field>
          </EditFormSection>

          <EditFormSection icon={Users} title="Company Details">
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "industry", label: "Industry"     },
                { key: "location", label: "Location"     },
                { key: "size",     label: "Team Size"    },
                { key: "founded",  label: "Founded Year" },
              ].map(({ key, label }) => (
                <Field key={key} label={label}>
                  <input value={draft[key] ?? ""} onChange={(e) => onChange(key, key === "founded" ? yearFilter(e.target.value) : e.target.value)}
                    inputMode={key === "founded" ? "numeric" : undefined}
                    list={key === "location" ? "business-location-suggestions" : undefined}
                    className="w-full px-4 py-2.5 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB]" />
                </Field>
              ))}
              <datalist id="business-location-suggestions">
                {INDIAN_CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
          </EditFormSection>

          <EditFormSection icon={ShieldCheck} title="Verification">
            {isVerified ? (
              <Field label="Verification Frame">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span className="relative inline-flex flex-shrink-0">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={frameShown}
                      onChange={() => setShowVerificationFrame(!frameShown)}
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#FF6B35] dark:bg-slate-700" />
                    <span className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full border border-slate-300 bg-white shadow transition-transform peer-checked:translate-x-full dark:border-slate-500" />
                  </span>
                  Display Verification Frame on my avatar
                </label>
              </Field>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Get Business Verified to unlock a frame around your avatar — see the Trust & Verification tab under Billing & Payments.
              </p>
            )}
          </EditFormSection>

          <EditFormSection icon={Mail} title="Contact" last>
            <Field label={<>Official Website <span className="normal-case font-normal text-slate-400 dark:text-slate-500">(optional)</span></>}>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input value={draft.website ?? ""} onChange={(e) => onChange("website", e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB]" />
              </div>
            </Field>

            <Field label="HR / Contact Email">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input type="email" value={draft.email ?? ""} onChange={(e) => onChange("email", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F6FF] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FAB]/20 focus:border-[#1B3FAB]" />
              </div>
            </Field>
          </EditFormSection>
        </div>
      </div>
    </div>
  );
}

// Same "distinct block, not one long stack" shape as WorkerProfile.jsx's
// EditSection — icon + real heading, divider between sections, generous
// spacing between fields within a section.
function EditFormSection({ icon: Icon, title, last = false, children }) {
  return (
    <div className={`${last ? "" : "mb-8 border-b border-slate-100 dark:border-slate-800 pb-8"}`}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-[#1B3FAB] dark:text-blue-400" />
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function BusinessCompany() {
  const { currentUser, updateCurrentUser } = useAuth();
  // Only name/initials are real — everything else in INITIAL_PROFILE stays
  // local mock content. Falls back to the account's own name (same rule
  // BusinessPostJob.jsx's preview and the real business_name the backend
  // returns everywhere else already use) rather than the mock "RetailX Pvt
  // Ltd" default — otherwise this one page shows a different name for the
  // same business than every other page does.
  const seedProfile = () => {
    const companyName = currentUser?.profile?.companyName || currentUser?.name;
    // coverImage is the one other real, persisted field here — the rest of
    // INITIAL_PROFILE stays local mock content until a real save exists.
    const coverImage = currentUser?.profile?.coverUrl || INITIAL_PROFILE.coverImage;
    return companyName
      ? { ...INITIAL_PROFILE, name: companyName, initials: getInitials(companyName), coverImage }
      : { ...INITIAL_PROFILE, coverImage };
  };

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(seedProfile);
  const [draft, setDraft]     = useState(seedProfile);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleChange  = (key, val) => setDraft((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      // draft.coverImage was previously dropped here — the Edit Profile
      // modal's own cover upload (onChange("coverImage", dataUrl)) only
      // ever touched local draft state; Save never included it in the
      // profilePatch, so a cover changed inside the modal silently
      // reverted to the old one on the next reload. Same real
      // profile.coverUrl field the standalone cover-upload button
      // (handleCoverUpload below) already persists correctly.
      const updatedUser = await updateOwnProfile({
        profilePatch: { companyName: draft.name.trim(), coverUrl: draft.coverImage },
      });
      updateCurrentUser(updatedUser);
      setProfile(draft);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err.message || "Could not save your company name — everything else here still isn't persisted yet.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel  = () => { setDraft(profile); setIsEditing(false); };

  // Same real profile.coverUrl field WorkerProfile.jsx's cover upload
  // already persists to — previously this only ever set local component
  // state, so the image looked like it saved but silently reverted on the
  // next reload/navigation (never actually reached the backend).
  const handleCoverUpload = async (dataUrl) => {
    setCoverError("");
    setCoverUploading(true);
    try {
      const updated = await updateOwnProfile({ profilePatch: { coverUrl: dataUrl } });
      updateCurrentUser(updated);
      setProfile((p) => ({ ...p, coverImage: dataUrl }));
      setDraft((p) => ({ ...p, coverImage: dataUrl }));
    } catch (err) {
      setCoverError(err instanceof ApiError ? err.message : "Could not upload cover photo.");
    } finally {
      setCoverUploading(false);
    }
  };

  return isEditing
    ? <EditForm draft={draft} onChange={handleChange} onSave={handleSave} onCancel={handleCancel} saving={saving} saveError={saveError} />
    : (
      <ProfileView
        profile={profile}
        onEdit={() => setIsEditing(true)}
        onCoverUpload={handleCoverUpload}
        coverUploading={coverUploading}
        coverError={coverError}
      />
    );
}
