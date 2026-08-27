import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Lock, Search, ShieldCheck, Users } from "lucide-react";
import heroVideoSrc from "../../assets/I_checked_the_video_again_The.mp4";
import { Button } from "./Button";
import { GlassCard } from "./GlassCard";
import MagneticButton from "./MagneticButton";

// Hand-staggered rather than routed through TextReveal — the color
// split ("Talent" dark, "Meets"/"Opportunity." accent) is real markup,
// not plain text TextReveal's word-splitter could recreate.
const heroWordVariants = {
  hidden: { opacity: 0, y: "0.4em", filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const trustItems = ["Vetted.", "Seamless.", "Secure."];

// AI Core badge — TEMPORARILY DISABLED (idea approved, UI/placement not
// good enough yet — revisit design before re-enabling). See the commented
// JSX block below in HeroSection for the markup this fed.
// const aiCoreSamples = [
//   "Priya matched — React Developer",
//   "Arjun matched — UI/UX Designer",
//   "Kavya matched — Content Writer",
//   "Rohan matched — Backend Engineer",
// ];

export function HeroSection({ onSelect }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  // AI Core badge state — disabled alongside its JSX below.
  // const [sampleIndex, setSampleIndex] = useState(0);
  // useEffect(() => {
  //   const id = setInterval(() => {
  //     setSampleIndex((i) => (i + 1) % aiCoreSamples.length);
  //   }, 2600);
  //   return () => clearInterval(id);
  // }, []);

  // Previously ignored whatever was typed here and sent everyone straight
  // to login regardless — now it actually searches the real, public Job
  // Board (see PublicJobFeed.jsx), which needs no account to browse.
  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/jobs?q=${encodeURIComponent(trimmed)}` : "/jobs");
  };

  return (
    <section className="wb-hero">
      <GlassCard className="wb-hero-card">
        {/* Fluid glass bubbles — decorative only, first in the DOM so
            every real element below stacks above it automatically. */}
        <div className="wb-hero-bubbles" aria-hidden="true">
          <span className="wb-bubble wb-bubble--1" />
          <span className="wb-bubble wb-bubble--2" />
          <span className="wb-bubble wb-bubble--3" />
          <span className="wb-bubble wb-bubble--4" />
          <span className="wb-bubble wb-bubble--5" />
        </div>

        <div className="wb-hero-copy">
          <div className="wb-badge-row">
            <span className="wb-pill">
              <Users size={18} /> VERIFIED TALENT
            </span>
            <span className="wb-pill">
              <Lock size={18} /> PROTECTED PAYMENTS
            </span>
          </div>

          <motion.h1
            className="font-display wb-hero-h1--js"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
          >
            {/* .wb-hero h1 span is styled accent-orange for every span —
                this one word must stay the base dark color, so its
                inline style overrides that rule directly (higher
                cascade priority than a class-based selector). */}
            <motion.span
              className="inline-block"
              style={{ color: "var(--wb-navy)" }}
              variants={heroWordVariants}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              Talent
            </motion.span>{" "}
            <motion.span className="inline-block" variants={heroWordVariants} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              Meets
            </motion.span>{" "}
            <motion.span className="inline-block" variants={heroWordVariants} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              Opportunity.
            </motion.span>
          </motion.h1>
          <p>Hire verified talent in minutes. Pay only after the work is completed.</p>

          <div className="wb-trust-list">
            {trustItems.map((item) => (
              <span key={item}>
                <Check size={14} /> {item}
              </span>
            ))}
          </div>

          {/* AI Core / Live Operations badge — DISABLED for now. Idea was
              good (a "something's actively matching" signal), but the
              design/placement wasn't good enough yet. Revisit later rather
              than delete — re-enable this block + the state/effect and
              aiCoreSamples above once redesigned.
          <motion.div
            className="mt-6 inline-flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-[#FF6B35]"
                animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF6B35]" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">AI Core · Live</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={sampleIndex}
                  className="text-xs font-bold text-[#0F172A]"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  {aiCoreSamples[sampleIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
          */}
        </div>

        {/* wb-hero-media-wrap handles entry animation; wb-hero-media handles hover */}
        <div className="wb-hero-media-wrap">
          <div className="wb-hero-media">
            <video src={heroVideoSrc} autoPlay loop muted playsInline />
            <span className="wb-video-badge">A BRIGHTER FUTURE</span>
          </div>
        </div>

        <form className="wb-search" onSubmit={handleSearch}>
          <Search size={22} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search open gigs by skill…"
          />
          <MagneticButton strength={0.3}>
            <Button type="submit">
              Search <ArrowRight size={18} />
            </Button>
          </MagneticButton>
        </form>

        <div className="wb-expert-pill">
          <ShieldCheck size={16} /> Protected Payments
        </div>
      </GlassCard>
    </section>
  );
}
