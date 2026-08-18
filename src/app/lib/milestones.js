import {
  Award,
  Crown,
  Gem,
  Link2,
  Medal,
  Pin,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

// Based on MASTER_ECONOMY_PLAN.md Part 6's Worker Reward Roadmap, with the
// "Fee Discount" rewards removed — the platform fee is flat (15%, not
// tiered) and never named in worker-facing UI, so a reward promising a
// tier-based fee break would be both false and a leak of the one thing
// that's deliberately never disclosed outside Terms & Conditions. Shared
// between WorkerMilestones.jsx (the full badge grid) and Avatar.jsx (the
// small pinned-badge overlay) so both always agree on which level maps to
// which icon/name, rather than keeping two lists in sync by hand. Mirrors
// backend/src/utils/gamification.js's MILESTONE_LEVELS exactly.
export const MILESTONES = [
  { level: 5, name: "First Steps", reward: 'Highlighted profile intro', icon: Sparkles, color: "cyan" },
  { level: 10, name: "Rising Talent", reward: 'Custom profile accent border color', icon: Star, color: "indigo" },
  { level: 20, name: "Momentum", reward: "Small priority boost in the matching algorithm", icon: TrendingUp, color: "blue" },
  { level: 25, name: "Verified Momentum", reward: 'Portfolio showcase reel; "Trending Talent" carousel eligibility', icon: Trophy, major: true },
  { level: 30, name: "Spotlight", reward: 'Pin one "spotlight project" at the top of your profile', icon: Pin, color: "rose" },
  { level: 40, name: "Early Access", reward: "Early-access window to new job postings", icon: Zap, color: "violet" },
  { level: 50, name: "Established Professional", reward: "Dedicated support queue", icon: ShieldCheck, major: true },
  { level: 60, name: "Signature Banner", reward: "Custom animated profile banner", icon: Award, color: "sky" },
  { level: 75, name: "Direct Line", reward: "Limited direct proposals without an open posting", icon: Send, color: "emerald" },
  { level: 100, name: "Top Rated", reward: "Gold-ring verification upgrade", icon: Crown, major: true },
  { level: 125, name: "Mentor", reward: "Paid mentorship sessions to newer workers", icon: Users, color: "fuchsia" },
  { level: 150, name: "Elite Circle", reward: "Priority dispute-resolution queue", icon: Gem, major: true },
  { level: 175, name: "Vanity URL", reward: "Custom vanity profile URL slug", icon: Link2, color: "teal" },
  { level: 200, name: "Legend of WorkBridge", reward: "Permanent hall-of-fame badge, for life", icon: Medal, major: true },
];

export function getMilestoneByLevel(level) {
  return MILESTONES.find((m) => m.level === level) ?? null;
}

// A "classic medal rosette" system — ONE consistent shape throughout (a
// scalloped-edge circle, the real "award medal" silhouette), rather than a
// different shape per tier — only the metal (color gradient) escalates
// Bronze -> Silver -> Gold -> Diamond, plus a ribbon tail on the top two
// tiers. Real <svg> with a multi-stop gradient (not a CSS approximation).
function scallopPoints(teeth, outerR, innerR, cx = 50, cy = 50) {
  const total = teeth * 2;
  const coords = [];
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    coords.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return coords.join(" ");
}
export const ROSETTE_POINTS = scallopPoints(20, 47, 40);

// The ribbon tail — two overlapping legs, each with a V-notch cut into its
// bottom edge (the classic medal-ribbon silhouette). Sits below the
// rosette, y=94..132, so RankBadge widens its viewBox vertically to fit
// when rank.ribbon is true.
export const RIBBON_SHAPES = {
  left: "40,94 50,94 50,132 44,120 40,132",
  right: "50,94 60,94 60,132 56,120 50,132",
};

// Multi-stop gradients (real <linearGradient> stops, not a 2-3 color CSS
// gradient) for a genuine metallic look, plus the glow color used by
// RankBadge's idle-float glow animation.
const RANK_TIERS = [
  { min: 0, name: "Bronze", stops: [["0%", "#E8C39E"], ["45%", "#CD853F"], ["100%", "#6B3F1D"]], stroke: "#F3D9B1", glowRgb: "184,115,51" },
  { min: 50, name: "Silver", stops: [["0%", "#FFFFFF"], ["45%", "#C7CDD6"], ["100%", "#5B6472"]], stroke: "#EDEFF2", glowRgb: "190,200,210" },
  { min: 100, name: "Gold", stops: [["0%", "#FFF3B0"], ["40%", "#FFD700"], ["100%", "#B8790A"]], stroke: "#FFF6D0", glowRgb: "255,196,0" },
  { min: 150, name: "Diamond", stops: [["0%", "#E8FFFF"], ["35%", "#00E5FF"], ["70%", "#6A5ACD"], ["100%", "#4B0082"]], stroke: "#CFFFFF", glowRgb: "0,229,255" },
];
const ROMAN = ["I", "II", "III", "IV", "V"];

export function getRankTier(level) {
  let tierIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (level >= RANK_TIERS[i].min) tierIndex = i;
  }
  const tier = RANK_TIERS[tierIndex];
  const isMaxRank = level >= 200;
  // Roman-numeral sub-rank, one step every 10 levels within the tier — same
  // pattern real ladders use (Bronze I..V, Silver I..V, ...). The absolute
  // Level 200 cap gets the unique label "Heroic" instead of "Diamond V" —
  // it's the single hard prestige ceiling, not just another sub-rank.
  const subIndex = Math.min(5, Math.floor((level - tier.min) / 10) + 1); // 1-5

  return {
    stops: tier.stops,
    stroke: tier.stroke,
    glowRgb: tier.glowRgb,
    label: isMaxRank ? "Heroic" : `${tier.name} ${ROMAN[subIndex - 1]}`,
    isMaxRank,
    ribbon: tierIndex >= 2, // Gold tier (Level 100+) and up
  };
}
