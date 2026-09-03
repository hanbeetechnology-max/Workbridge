import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
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
  Users,
} from "lucide-react";
import Avatar from "../shared/Avatar";
import EditableCoverPhoto from "../shared/EditableCoverPhoto";
import ShareProfileButton from "../shared/ShareProfileButton";
import { useAuth } from "../../context/AuthContext";
import { updateOwnProfile } from "../../lib/profilesApi";
import { listProjects } from "../../lib/projectsApi";
import { listReviewsFor } from "../../lib/reviewsApi";
import { ApiError } from "../../lib/apiClient";
import { INDIAN_CITIES } from "../../lib/indianCities";
import { getInitials } from "../../utils/formValidation";
import { yearFilter, businessNameFilter } from "../../utils/inputGuards";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function timeAgo(dateString) {
  const ms = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

// Matches BusinessOverview.jsx's exact definitions so this page's numbers
// never disagree with the real dashboard's — see that file for the reasoning
// behind each status set (why INVITED counts as active, why PENDING_FUNDS
// isn't "held", etc.).
const ACTIVE_STATUSES = new Set(["INVITED", "ACCEPTED", "PENDING_FUNDS", "FUNDS_SECURED", "WORK_IN_PROGRESS", "FILES_SUBMITTED", "PENDING_RELEASE", "DISPUTED"]);


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

function ProfileView({ profile, isVerified, stats, openProjects, reviews, reviewsLoading, avgRating, reviewsCount, onEdit, onCoverUpload, coverUploading, coverError }) {
  // Real bug fix: this used to be window.location.href — the CURRENT page's
  // URL, which on this tab is the logged-in-only dashboard route
  // (/business-dashboard?tab=company), not a shareable link. Sharing that
  // gave anyone who opened it a dead end (ProtectedRoute bounces a visitor
  // with no session straight to /auth — nothing was ever actually exposed
  // to a stranger), but it also meant the button never did what it claimed
  // to. The real public, unauthenticated destination is
  // PublicProfilePage.jsx's /profiles/:id route (public_user_profiles view,
  // no PII, no session) — same pattern WorkerProfile.jsx's Share Profile
  // button already uses correctly.
  const { currentUser } = useAuth();
  const shareUrl = currentUser?.id ? `${window.location.origin}/profiles/${currentUser.id}` : undefined;
  const ratingCounts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => Math.round(r.rating) === n).length);

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
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 flex-shrink-0 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/40">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>

                {profile.tagline && <p className="text-slate-500 dark:text-slate-400 text-sm italic mb-2">{profile.tagline}</p>}

                {/* Meta chips — each only shows once the business has
                    actually filled it in via Edit Profile. */}
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                  {[
                    { Icon: Building2, val: profile.industry },
                    { Icon: MapPin,    val: profile.location  },
                    { Icon: Users,     val: profile.size      },
                    { Icon: Calendar,  val: profile.founded ? `Est. ${profile.founded}` : "" },
                  ].filter(({ val }) => val).map(({ Icon, val }) => (
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
                {profile.bio && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio}</p>}
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

        {/* KPI row — real, computed from this business's actual projects
            (same source/formulas as BusinessOverview.jsx's dashboard tiles,
            so the two pages never disagree). */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map(({ label, value, Icon, color, bg }, i) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5 flex items-center gap-3 wb-card-enter"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className={`text-2xl font-extrabold ${color} leading-none font-display`}>{value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT – main content (2/3) */}
          <div className="lg:col-span-2 space-y-5">

            {/* Culture — real, persisted field (profile.culture); no tag
                pills anymore, those were decorative fixed labels with no
                real data behind them. */}
            {profile.culture && (
              <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 font-display">Culture &amp; Work Style</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{profile.culture}</p>
              </div>
            )}

            {/* Current Openings — real OPEN job-board posts. */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-display">Current Openings</h2>
                <span className="text-xs font-bold text-[#1B3FAB] dark:text-blue-400 bg-[#F4F6FF] dark:bg-[#1B3FAB]/10 px-2.5 py-1 rounded-full border border-[#1B3FAB]/10">
                  {openProjects.length} Open
                </span>
              </div>
              {openProjects.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No open job posts right now.</p>
              ) : (
                <div className="space-y-3">
                  {openProjects.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-[#F4F6FF] hover:border-[#1B3FAB]/20 transition-all group dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-[#1B3FAB]/10"
                    >
                      <div className="w-10 h-10 bg-[#1B3FAB] rounded-xl flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0 font-display">
                        {profile.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#0F172A] dark:text-white truncate group-hover:text-[#1B3FAB] dark:group-hover:text-blue-400 transition-colors">{job.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatINR(job.budget)} · Posted {timeAgo(job.created_at)}</p>
                      </div>
                      {job.is_urgent && (
                        <span className="flex-shrink-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-500/10 dark:border-red-900/40">
                          Urgent
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Worker Reviews — real reviews left by workers after a
                completed project (reviewsApi.listReviewsFor), same source
                as the public profile page. */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-display">Worker Reviews</h2>
                {reviewsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">({reviewsCount})</span>
                  </div>
                )}
              </div>

              {reviewsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-600" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No reviews yet — they'll show up here once a worker reviews a completed project.</p>
              ) : (
                <>
                  {/* Rating breakdown — real counts from the reviews above. */}
                  <div className="bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-xl p-4 mb-5 space-y-2.5">
                    {[5, 4, 3, 2, 1].map((n, i) => (
                      <RatingBar key={n} label={`${n} ★`} value={ratingCounts[i]} total={reviews.length} />
                    ))}
                  </div>

                  {/* Review cards */}
                  <div className="space-y-4">
                    {reviews.slice(0, 10).map((rev) => (
                      <div key={rev.id} className="p-4 bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Avatar
                            initials={getInitials(rev.reviewer_name)}
                            avatarUrl={rev.reviewer_avatar_url}
                            bg="bg-[#1B3FAB]"
                            size="w-9 h-9"
                            text="text-xs"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-bold text-[#0F172A] dark:text-white text-sm">{rev.reviewer_name}</span>
                              <div className="ml-auto flex gap-0.5 flex-shrink-0">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                                ))}
                              </div>
                            </div>
                            {rev.feedback && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rev.feedback}</p>}
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">{timeAgo(rev.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
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

            {/* Trust & Verification — the one real signal that exists
                (currentUser.verified), no fabricated per-document
                checklist (GST/PAN/Aadhaar aren't tracked as separate
                booleans anywhere in the schema). */}
            <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 font-display">Trust &amp; Verification</h3>
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isVerified ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-900/40" : "bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"}`}>
                  <CheckCircle2 className={`w-3 h-3 ${isVerified ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
                </div>
                <span className={`text-sm flex-1 ${isVerified ? "font-semibold text-[#0F172A] dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                  Business Verified
                </span>
                {!isVerified && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-900/40">
                    Pending
                  </span>
                )}
              </div>
              {isVerified && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Verified &amp; trusted employer</span>
                </div>
              )}
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
                Get Business Verified to unlock a frame around your avatar — use "Get Business Verified" in the sidebar to start.
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

// Every field here is real and persisted in users.profile (JSONB) via
// updateOwnProfile's profilePatch merge — companyName/coverUrl were
// already wired; tagline/industry/location/size/founded/bio/culture/
// website/email are fixed here to actually save too (previously typed but
// silently dropped on every Save — see handleSave below).
function seedProfile(currentUser) {
  const p = currentUser?.profile ?? {};
  const companyName = p.companyName || currentUser?.name || "";
  return {
    name: companyName,
    initials: companyName ? getInitials(companyName) : "",
    coverImage: p.coverUrl || "",
    tagline: p.tagline || "",
    industry: p.industry || "",
    location: p.location || "",
    size: p.size || "",
    founded: p.founded || "",
    website: p.website || "",
    email: p.email || "",
    bio: p.bio || "",
    culture: p.culture || "",
  };
}

export default function BusinessCompany() {
  const { currentUser, updateCurrentUser } = useAuth();
  const isVerified = Boolean(currentUser?.verified);

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(() => seedProfile(currentUser));
  const [draft, setDraft]     = useState(() => seedProfile(currentUser));
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Real activity data — same source BusinessOverview.jsx's dashboard
  // tiles use, so this page's numbers can never drift out of sync with it.
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listProjects({ role: "business" })
      .then((data) => { if (!cancelled) setProjects(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProjectsLoading(false); });
    if (currentUser?.id) {
      listReviewsFor(currentUser.id)
        .then((data) => { if (!cancelled) setReviews(data); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setReviewsLoading(false); });
    } else {
      setReviewsLoading(false);
    }
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const openProjects = useMemo(() => projects.filter((p) => p.status === "OPEN"), [projects]);
  const workersHired = useMemo(
    () => new Set(projects.filter((p) => p.status !== "INVITED").map((p) => p.worker_id)).size,
    [projects]
  );
  const activeCount = useMemo(() => projects.filter((p) => ACTIVE_STATUSES.has(p.status)).length, [projects]);
  const fundsDelivered = useMemo(
    () => projects.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + Number(p.budget), 0),
    [projects]
  );

  const stats = projectsLoading
    ? []
    : [
        { label: "Jobs Posted",      value: String(projects.length),      Icon: Briefcase,  color: "text-[#1B3FAB] dark:text-blue-400",      bg: "bg-[#F4F6FF] dark:bg-[#1B3FAB]/10" },
        { label: "Workers Hired",    value: String(workersHired),         Icon: Users,      color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
        { label: "Active Projects",  value: String(activeCount),          Icon: ShieldCheck, color: "text-[#FF6B35]",                        bg: "bg-orange-50 dark:bg-orange-500/10" },
        { label: "Funds Delivered",  value: formatINR(fundsDelivered),    Icon: CheckCircle2, color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-500/10" },
      ];

  const handleChange  = (key, val) => setDraft((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const updatedUser = await updateOwnProfile({
        profilePatch: {
          companyName: draft.name.trim(),
          coverUrl: draft.coverImage,
          tagline: draft.tagline?.trim() ?? "",
          industry: draft.industry?.trim() ?? "",
          location: draft.location?.trim() ?? "",
          size: draft.size?.trim() ?? "",
          founded: draft.founded?.trim() ?? "",
          website: draft.website?.trim() ?? "",
          email: draft.email?.trim() ?? "",
          bio: draft.bio?.trim() ?? "",
          culture: draft.culture?.trim() ?? "",
        },
      });
      updateCurrentUser(updatedUser);
      setProfile(draft);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save your company profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel  = () => { setDraft(profile); setIsEditing(false); };

  // Same real profile.coverUrl field WorkerProfile.jsx's cover upload
  // already persists to.
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
        isVerified={isVerified}
        stats={stats}
        openProjects={openProjects}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        avgRating={Number(currentUser?.rating) || 0}
        reviewsCount={currentUser?.reviews_count || 0}
        onEdit={() => setIsEditing(true)}
        onCoverUpload={handleCoverUpload}
        coverUploading={coverUploading}
        coverError={coverError}
      />
    );
}
