// Numeric mirror of the CSS motion tokens in src/styles/theme.css
// (--duration-*, --ease-*) — `motion` transition props need real numbers/
// arrays, not CSS custom properties, so this is the second half of that
// token pair. Keep both in sync by hand when either changes.

export const duration = {
  fast: 0.15,
  base: 0.3,
  slow: 0.6,
  slower: 0.9,
};

export const ease = {
  outExpo: [0.16, 1, 0.3, 1],
  outQuart: [0.22, 1, 0.36, 1],
  spring: [0.34, 1.56, 0.64, 1],
  inOut: [0.65, 0, 0.35, 1],
};

// Standard scroll-reveal transition — used by ScrollReveal.jsx and any
// component animating its own in-view state the same way.
export const revealTransition = {
  duration: duration.slow,
  ease: ease.outQuart,
};

// Shared variants for a fade+rise reveal, keyed by direction so callers
// don't hand-roll the same four objects repeatedly.
export function riseVariants(distance = 24) {
  return {
    hidden: { opacity: 0, y: distance },
    visible: { opacity: 1, y: 0 },
  };
}
