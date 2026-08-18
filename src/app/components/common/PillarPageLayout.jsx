import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import TextReveal from "./TextReveal";
import MagneticButton from "./MagneticButton";

// Keeps a single <meta> tag in sync without leaving duplicates behind on
// route changes — each Pillar Page calls this once with its own SEO copy.
function useSEO({ title, description, keywords }) {
  useEffect(() => {
    document.title = title;

    const setMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
  }, [title, description, keywords]);
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

/**
 * Shared scaffold for the three marketing Pillar Pages (Find Work, Hire
 * Talent, Enterprise). Renders inside <PageShell>, which already supplies
 * the site nav and footer — this component owns only the hero + feature
 * grid content between them.
 */
export default function PillarPageLayout({
  seoTitle,
  seoDescription,
  seoKeywords,
  eyebrow,
  title,
  subtitle,
  heroContent,
  ctaLabel = "Get Started Now",
  onCta,
  features = [],
}) {
  useSEO({ title: seoTitle, description: seoDescription, keywords: seoKeywords });

  return (
    <div className="bg-[#F8FAFC] dark:bg-[#070B18]">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 transition-colors hover:text-[#FF6B35]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to Home
          </Link>
        </div>
      </section>
      <section className="px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-md sm:p-16">
          {/* Decorative glow blobs — signature WorkBridge glassmorphism treatment */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FF6B35] opacity-20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#1B3FAB] opacity-15 blur-3xl" aria-hidden="true" />

          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="relative text-center"
          >
            {eyebrow && (
              <motion.span
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6B35]/20 bg-[#FF6B35]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FF6B35]"
              >
                {eyebrow}
              </motion.span>
            )}

            <TextReveal
              as="h1"
              text={title}
              className="font-display mt-5 text-4xl font-black tracking-tight text-[#0F172A] dark:text-white sm:text-6xl"
            />

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg"
            >
              {subtitle}
            </motion.p>

            {heroContent && (
              <motion.div variants={fadeUp} transition={{ duration: 0.5, ease: "easeOut" }} className="mt-7">
                {heroContent}
              </motion.div>
            )}

            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease: "easeOut" }} className="mt-9">
              <MagneticButton strength={0.3}>
                <button
                  onClick={onCta}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-8 py-4 text-base font-bold text-white shadow-[0_10px_30px_-8px_rgba(255,107,53,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e55a2b] hover:shadow-glow-accent active:scale-95"
                >
                  {ctaLabel}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </MagneticButton>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature grid ───────────────────────────────────────────────── */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title: featureTitle, description }, idx) => (
            <motion.div
              key={featureTitle}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (idx % 3) * 0.1, ease: "easeOut" }}
              className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B35]/10">
                <Icon className="h-5 w-5 text-[#FF6B35]" />
              </div>
              <h3 className="font-display mt-4 text-base font-extrabold text-[#0F172A] dark:text-white">
                {featureTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
