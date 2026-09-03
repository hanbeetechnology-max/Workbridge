// The "Verification Frame" system — real, glowing ring treatments for a
// verified user's avatar, replacing the old tiny-badge-only treatment.
// Four variants, matching the four real tiers in VerificationFeesTable.jsx:
//
//   emerald ("ID Verified — Trust Guard")   — Worker ID Verified, currentUser.verified
//   glass   ("Company Verified — Minimalist Pro") — Business Verified, isVerified
//   gold    ("Elite — Gold Standard")       — Full Trust Frame (₹699) — PREVIEW ONLY,
//                                              no real per-user "bought full trust" flag
//                                              exists yet, so this never renders on a
//                                              live avatar, only in the pricing table.
//   orange  ("Enterprise — Signature Glow") — spare/default, brand-primary fallback.
//
// Applied wherever a call site has a REAL verified flag — never on mock/
// preview data.
const VARIANTS = {
  emerald: "ring-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15),0_0_16px_rgba(16,185,129,0.45)]",
  // ring-slate-200 was nearly invisible against a white card (same tone as
  // the page background) — slate-400 keeps the "frosted steel" look but
  // actually reads as a frame in light mode, not just dark.
  glass: "ring-slate-400 dark:ring-slate-300/80 shadow-[0_0_14px_rgba(100,116,139,0.5)]",
  gold: "ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.55)]",
  orange: "ring-[#FF6B35] shadow-[0_0_16px_rgba(255,107,53,0.5)]",
};

export function verifiedRingClass(isVerified, size = "md", variant = "orange") {
  const ring = size === "sm" ? "ring-2" : "ring-4";
  if (!isVerified) return `${ring} ring-white dark:ring-slate-800`;
  return `${ring} ${VARIANTS[variant] ?? VARIANTS.orange}`;
}

// "Stealth Mode" gate — a real verified user can still choose to hide their
// frame (AuthContext.jsx's setShowVerificationFrame). Undefined/missing
// defaults to shown, matching the opt-out model the toggle itself offers.
export function shouldShowFrame(verified, currentUser) {
  return Boolean(verified) && currentUser?.showVerificationFrame !== false;
}
