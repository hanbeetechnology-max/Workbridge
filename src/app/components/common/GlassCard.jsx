// variant contract — deliberately restrained:
//   "default"  — the original translucent card, general marketing use.
//   "elevated" — hero overlays and modal chrome only. Adds a resting
//                shadow + lift-on-hover. Never use on dense dashboard
//                tables/lists (competes with data readability).
//   "subtle"   — a lighter glass treatment for nested/secondary surfaces
//                (a card inside a card). Never stack more than 2 glass
//                layers on top of each other regardless of variant.
const VARIANT_CLASS = {
  default: "",
  elevated: "wb-glass-card--elevated",
  subtle: "wb-glass-card--subtle",
};

export function GlassCard({ children, className = "", variant = "default" }) {
  const variantClass = VARIANT_CLASS[variant] ?? "";
  return <div className={`wb-glass-card ${variantClass} ${className}`.trim()}>{children}</div>;
}
