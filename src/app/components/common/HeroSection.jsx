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

export function HeroSection({ onSelect }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

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
