import { useState } from "react";
import { motion } from "motion/react";

// A physics-based "unstack" reveal for a compound feature (Escrow Security,
// the 3-step hire flow, the Smart Workspace) — the layers sit collapsed into
// one card until scrolled into view, then separate along the Y/Z axis to
// show the pieces underneath, and pull back together on hover the way a
// real exploded-parts diagram would settle when you let go of it.
//
// layers: [{ icon: LucideIcon, title, text, accent? }], rendered back-to-front
// (layers[0] ends up on top once exploded). accent is an optional hex used
// for that layer's icon tile — falls back to the WorkBridge navy/orange pair.
const SPRING = { type: "spring", stiffness: 300, damping: 25 };

export default function ExplodeView({ layers, className = "" }) {
  const [exploded, setExploded] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      style={{ height: 96 + layers.length * 108 }}
      onMouseEnter={() => setExploded(false)}
      onMouseLeave={() => setExploded(true)}
    >
      <motion.div
        className="absolute inset-x-0 top-0"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        onViewportEnter={() => setExploded(true)}
      >
        {layers.map((layer, i) => {
          const Icon = layer.icon;
          const accent = layer.accent ?? "#FF6B35";
          return (
            <motion.div
              key={layer.title}
              className="absolute inset-x-0 flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              initial={false}
              animate={
                exploded
                  ? { top: i * 108, scale: 1, rotate: 0, opacity: 1 }
                  : { top: i * 14, scale: 1 - i * 0.03, rotate: i % 2 === 0 ? -1.5 : 1.5, opacity: 1 - i * 0.12 }
              }
              transition={SPRING}
              style={{ zIndex: layers.length - i }}
            >
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${accent}1A`, color: accent }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h4 className="font-display text-sm font-bold tracking-tight text-[#0F172A]">{layer.title}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{layer.text}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
