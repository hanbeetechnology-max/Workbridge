import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Medal,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import { listReviewsFor } from "../../lib/reviewsApi";
import { getInitials } from "../../utils/formValidation";
import PinnedBadgeOverlay from "../shared/PinnedBadgeOverlay";
import EditableCoverPhoto from "../shared/EditableCoverPhoto";
import ShareProfileButton from "../shared/ShareProfileButton";

function ProfileSection({ title, children }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:bg-slate-900">
      <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SkillPill({ children }) {
  return (
    <span className="rounded-full bg-slate-100 px-3.5 py-2 text-xs font-bold text-[#0F172A] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700">
      {children}
    </span>
  );
}

function StarRating({ rating = 5 }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < rating ? "fill-current" : "text-slate-200 dark:text-slate-700"}`} />
      ))}
    </div>
  );
}

function TrustBar({ score }) {
  const safeScore = score ?? 0;
  const label = safeScore >= 750 ? "Excellent" : safeScore >= 500 ? "Good Standing" : "Building Trust";
  const percentage = Math.min(100, Math.max(0, safeScore / 10));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#0F172A] dark:text-white">Behavior Score: {safeScore} / 1000</p>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{label}</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {label} standing — built from how this worker applies for jobs and conducts themselves on WorkBridge.
      </p>
    </div>
  );
}

// The public, read-only view of a worker's profile — real data only (id,
// name, avatar_url, title, verified, behavior_score, rating, reviews_count,
// profile{skills,bio,hourlyRate,location}), fetched via listWorkers()/
// getPublicProfile(). Used from BusinessWorkers.jsx's profile portal.
export default function WorkerShareableProfile({ worker }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (!worker?.id) return;
    listReviewsFor(worker.id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [worker?.id]);

  if (!worker) return null;

  const profile = worker.profile ?? {};
  const skills = profile.skills ?? [];
  const education = profile.education ?? [];
  const certifications = profile.certifications ?? [];
  const projects = profile.projects ?? [];

  return (
    <main className="min-h-full bg-[#F8FAFC] font-sans text-[#0F172A] dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] dark:bg-slate-900">
          <EditableCoverPhoto coverUrl={profile.coverUrl} editable={false} heightClass="h-52 rounded-t-xl sm:h-60" />
          <div className="px-5 pb-7 sm:px-8">
            <div className="relative z-10 -mt-12 grid gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] lg:grid-cols-[1fr_auto] lg:items-start dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative h-32 w-32 flex-none">
                  {worker.avatar_url ? (
                    <img
                      src={worker.avatar_url}
                      alt={worker.name}
                      className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-xl ring-1 ring-slate-200 dark:border-slate-800 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-[#1B3FAB] text-3xl font-bold text-white shadow-xl ring-1 ring-slate-200 dark:border-slate-800 dark:ring-slate-700">
                      {getInitials(worker.name)}
                    </div>
                  )}
                  <span className="absolute bottom-3 right-3 h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.16)] dark:border-slate-900" />
                  <PinnedBadgeOverlay
                    level={worker.pinned_milestone_level}
                    size="md"
                    className="-bottom-3 -left-3"
                  />
                </div>
                <div className="pb-1">
                  <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl dark:text-white">{worker.name}</h1>
                  <p className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-300">{worker.title || "Worker"}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {profile.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                        <MapPin className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        {profile.location}
                      </span>
                    )}
                    {worker.verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 font-bold text-[#FF6B35] ring-1 ring-orange-100 dark:bg-orange-500/10 dark:ring-orange-500/20">
                        <Sparkles className="h-4 w-4" />
                        Verified Pro
                      </span>
                    )}
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {profile.bio || "This worker hasn't added a bio yet."}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-start justify-end">
                <ShareProfileButton
                  url={typeof window !== "undefined" ? `${window.location.origin}/profiles/${worker.id}` : undefined}
                  title={worker.name}
                  text={`Check out ${worker.name}'s profile on WorkBridge`}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
          <div className="space-y-8">
            {projects.length > 0 && (
              <ProfileSection title="Projects">
                <div className="grid gap-4 md:grid-cols-2">
                  {projects.map((p, index) => (
                    <article key={index} className="rounded-lg bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                      <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{p.title}</h3>
                      {p.description && <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{p.description}</p>}
                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1B3FAB] dark:text-blue-400 hover:underline"
                        >
                          View project
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </ProfileSection>
            )}

            {education.length > 0 && (
              <ProfileSection title="Education">
                <div className="space-y-4">
                  {education.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-white">{entry.degree}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{entry.school}</p>
                      </div>
                      {entry.year && <span className="flex-shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">{entry.year}</span>}
                    </div>
                  ))}
                </div>
              </ProfileSection>
            )}

            {certifications.length > 0 && (
              <ProfileSection title="Courses & Certifications">
                <div className="flex flex-wrap gap-3">
                  {certifications.map((c, index) => (
                    <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
                      <p className="text-sm font-bold text-[#0F172A] dark:text-white">{c.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{[c.issuer, c.year].filter(Boolean).join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </ProfileSection>
            )}

            <ProfileSection title="Client Reviews">
              {reviewsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3FAB] dark:border-slate-700" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No reviews yet.</p>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-lg bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                      <div className="flex items-center gap-3">
                        {review.reviewer_avatar_url ? (
                          <img
                            src={review.reviewer_avatar_url}
                            alt={review.reviewer_name}
                            className="h-11 w-11 flex-shrink-0 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-700 dark:text-slate-300">
                            {getInitials(review.reviewer_name)}
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{review.reviewer_name}</h3>
                        </div>
                      </div>
                      <div className="mt-4">
                        <StarRating rating={review.rating} />
                      </div>
                      {review.feedback && <p className="mt-4 text-sm italic leading-6 text-slate-500 dark:text-slate-400">"{review.feedback}"</p>}
                    </article>
                  ))}
                </div>
              )}
            </ProfileSection>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-lg bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Trust Widget</p>
                  <h2 className="mt-1 text-lg font-bold text-[#0F172A] dark:text-white">Verified Reliability</h2>
                </div>
                <Medal className="h-6 w-6 text-amber-500" />
              </div>
              <div className="mt-6">
                <TrustBar score={worker.behavior_score} />
              </div>
            </section>

            <section className="rounded-lg bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:bg-slate-900">
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Quick Stats</h2>
              <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Rating</span>
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">{worker.rating ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Reviews</span>
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">{worker.reviews_count ?? 0}</span>
                </div>
                {profile.hourlyRate && (
                  <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Rate</span>
                    <span className="text-sm font-bold text-[#0F172A] dark:text-white">₹{Number(profile.hourlyRate).toLocaleString("en-IN")}/hr</span>
                  </div>
                )}
              </div>
              {worker.verified && (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Identity verified
                </div>
              )}
            </section>

            <section className="rounded-lg bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:bg-slate-900">
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Skills</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {skills.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No skills listed yet.</p>
                ) : (
                  skills.map((skill) => <SkillPill key={skill}>{skill}</SkillPill>)
                )}
              </div>
            </section>

            {/* Deliberately always-dark accent card (navy + orange), not
                theme-following — same "always dark" treatment as other
                fixed accent panels in the app. */}
            <section className="rounded-lg bg-[#0F172A] p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-100">
                <Clock3 className="h-4 w-4 text-[#FF6B35]" />
                Available this week
              </div>
              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e95c25]">
                <Send className="h-4 w-4" />
                Start a Contract
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
