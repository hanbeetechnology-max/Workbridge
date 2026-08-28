import { useEffect, useState } from "react";
import { HeroSection } from "../components/common/HeroSection";
import { TrustedPartners } from "../components/landing/TrustedPartners";
import { PillarSections } from "../components/common/PillarSections";
import ScrollReveal, { ScrollRevealGroup, ScrollRevealItem } from "../components/common/ScrollReveal";
import TextReveal from "../components/common/TextReveal";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getFeaturedReviews } from "../lib/reviewsApi";
import { getInitials } from "../utils/formValidation";
import { ApiError } from "../lib/apiClient";

const ROLE_LABEL = { business: "Verified Business", worker: "Top Rated Worker" };

function WallOfLoveCard({ review }) {
  const roleLabel = ROLE_LABEL[review.reviewer_role] ?? review.reviewer_role;
  return (
    <ScrollRevealItem
      distance={16}
      className="mb-6 break-inside-avoid rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">“{review.feedback}”</p>
      <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {getInitials(review.reviewer_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#0F172A] dark:text-white">{review.reviewer_name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
        </div>
      </div>
    </ScrollRevealItem>
  );
}

// Real reviews, pulled live (GET /api/reviews/featured) from completed,
// escrow-protected projects — nothing here is written by us. Migrated in
// from the old standalone /testimonials page onto the homepage.
function WallOfLove() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getFeaturedReviews()
      .then((data) => setReviews(data.reviews))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Could not load reviews."))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !loadError && reviews.length === 0) return null;

  return (
    // wb-section, not an ad-hoc Tailwind wrapper — matches the same
    // max-width (1180px) and 96px/72px section-padding rhythm every other
    // section on this page uses (see main.css), so this doesn't read as a
    // narrower, bolted-on block once you scroll past the pillar sections.
    <section className="wb-section">
      <div className="wb-section-header wb-section-header--js" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <TextReveal as="h2" text="Building bridges between teams and talent" />
      </div>
      {/* Outside wb-section-header on purpose — that class's `p` selector is
          styled for the small uppercase orange eyebrow label every other
          section uses above its h2, not body copy. */}
      <p className="mx-auto mb-12 mt-3 max-w-xl text-center text-base text-slate-500 dark:text-slate-400">
        Connect with businesses and talent already growing on WorkBridge.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF6B35]" />
        </div>
      ) : loadError ? (
        <div className="mx-auto max-w-md rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {loadError}
        </div>
      ) : (
        <ScrollRevealGroup className="columns-1 gap-6 sm:columns-2 md:columns-3">
          {reviews.map((review) => (
            <WallOfLoveCard key={review.id} review={review} />
          ))}
        </ScrollRevealGroup>
      )}
    </section>
  );
}

export default function LandingPage({ onSelect }) {
  useDocumentTitle("WorkBridge — Freelance Marketplace for Verified Talent");

  return (
    <>
      <HeroSection onSelect={onSelect} />
      <TrustedPartners />
      {/* showLink={false} forces all section CTAs to call onSelect() → /auth directly */}
      <PillarSections onSelect={onSelect} showLink={false} />
      <WallOfLove />
    </>
  );
}
