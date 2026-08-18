import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

// Cursor-follow offset for primary marketing CTAs — a wrapper, not a
// replacement element, so whatever's passed as children (a react-router
// <Link>, a <button>, a form-submit <Button>) keeps its real behavior
// untouched; this only ever adds a transform to the wrapper around it.
// Bounded to a fraction of the element's own size so it reads as
// "responsive," not "sliding around." Disabled outright on touch/coarse
// pointers (no hover, nothing to react to) and under prefers-reduced-motion.
export default function MagneticButton({ children, className = "", strength = 0.35, style, ...rest }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  const canMagnetize = !reducedMotion && typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;

  const handleMove = (event) => {
    if (!canMagnetize || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`.trim()}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={canMagnetize ? { x: springX, y: springY, ...style } : style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
