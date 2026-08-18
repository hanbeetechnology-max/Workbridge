import { useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Send, ShieldCheck, Star } from "lucide-react";
import EditableCoverPhoto from "../shared/EditableCoverPhoto";
import ShareProfileButton from "../shared/ShareProfileButton";
import { listReviewsFor } from "../../lib/reviewsApi";
import { getInitials } from "../../utils/formValidation";

// The public, read-only view of a business's profile — real data only (id,
// name, role, avatar_url, verified, rating, reviews_count, created_at,
// profile{companyName, coverUrl}), fetched via getPublicProfile(). No mock
// job listings, fake reviews, or a fabricated verification checklist here
// like BusinessCompany.jsx (the owner's own dashboard) has — that page's
// mock content is only ever seen by the account owner, but this one is a
// public, unauthenticated URL. Showing a stranger a job post or review
// that doesn't exist isn't an honest preview, it's actively misleading.
// Same "real data only, honest empty states" precedent as
// WorkerShareableProfile.jsx — reviews reuse the exact same
// listReviewsFor(id) call that component uses, since reviews aren't
// role-specific in this schema.
export default function BusinessShareableProfile({ business }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    listReviewsFor(business.id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [business?.id]);

  if (!business) return null;

  const profile = business.profile ?? {};
  const displayName = profile.companyName || business.name;

  return (
    <main className="min-h-full bg-[#F8FAFC] dark:bg-[#070B18] font-sans text-[#0F172A] dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <EditableCoverPhoto coverUrl={profile.coverUrl} editable={false} heightClass="h-52 rounded-t-xl sm:h-60" />
          <div className="px-5 pb-7 sm:px-8">
            <div className="relative z-10 -mt-12 grid gap-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="relative h-32 w-32 flex-none">
                  {business.avatar_url ? (
                    <img
                      src={business.avatar_url}
                      alt={displayName}
                      className="h-32 w-32 rounded-2xl border-4 border-white object-cover shadow-xl ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-[#1B3FAB] text-3xl font-bold text-white shadow-xl ring-1 ring-slate-200">
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>
                <div className="pb-1">
                  <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">{displayName}</h1>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Business on WorkBridge
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {business.verified && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/40">
                        <ShieldCheck className="h-4 w-4" />
                        Verified Business
                      </span>
                    )}
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {profile.bio || `${displayName} hasn't added a company bio yet.`}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-start justify-end">
                <ShareProfileButton
                  url={typeof window !== "undefined" ? `${window.location.origin}/profiles/${business.id}` : undefined}
                  title={displayName}
                  text={`Check out ${displayName} on WorkBridge`}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
          <div className="space-y-8">
            <section className="rounded-lg bg-white dark:bg-slate-900 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Reviews from Freelancers</h2>
              <div className="mt-5">
                {reviewsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-[#1B3FAB]" />
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No reviews yet.</p>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-5 ring-1 ring-slate-100 dark:ring-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                            {getInitials(review.reviewer_name)}
                          </div>
                          <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{review.reviewer_name}</h3>
                        </div>
                        <div className="mt-4 flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-slate-200 dark:text-slate-600"}`} />
                          ))}
                        </div>
                        {review.feedback && <p className="mt-4 text-sm italic leading-6 text-slate-500 dark:text-slate-400">"{review.feedback}"</p>}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-lg bg-white dark:bg-slate-900 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">Quick Stats</h2>
              <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Rating</span>
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">{business.rating ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Reviews</span>
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">{business.reviews_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">On WorkBridge since</span>
                  <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                    {business.created_at ? new Date(business.created_at).getFullYear() : "—"}
                  </span>
                </div>
              </div>
              {business.verified && (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Identity verified
                </div>
              )}
            </section>

            <section className="rounded-lg bg-[#0F172A] p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-100">
                <Briefcase className="h-4 w-4 text-[#FF6B35]" />
                Looking for open roles?
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {displayName}'s live job postings show up on the WorkBridge Job Feed, not this page.
              </p>
              <a
                href="/find-work"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B35] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e95c25]"
              >
                <Send className="h-4 w-4" />
                Browse the Job Feed
              </a>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
