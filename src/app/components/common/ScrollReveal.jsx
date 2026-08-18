import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { revealTransition, riseVariants } from "../../lib/motion-tokens";

// Scroll-triggered fade+rise, once per element (viewport margin pulls the
// trigger point up so content settles before it's fully in view, not at
// the exact bottom edge). With prefers-reduced-motion, travel distance
// collapses to 0 — still a fade, no vertical motion.
export default function ScrollReveal({
  as: Tag = motion.div,
  children,
  delay = 0,
  distance = 24,
  className = "",
  once = true,
  amount = 0.2,
  ...rest
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount, margin: "0px 0px -10% 0px" });
  const reducedMotion = useReducedMotion();
  const variants = riseVariants(reducedMotion ? 0 : distance);

  return (
    <Tag
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      transition={{ ...revealTransition, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Wraps a list of children, staggering each direct child's reveal — for
// card grids/feature rows where a uniform per-item delay reads better
// than every item animating in unison.
export function ScrollRevealGroup({ children, className = "", stagger = 0.08, amount = 0.2, ...rest }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount, margin: "0px 0px -10% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function ScrollRevealItem({ as: Tag = motion.div, children, className = "", distance = 20, ...rest }) {
  return (
    <Tag className={className} variants={riseVariants(distance)} transition={revealTransition} {...rest}>
      {children}
    </Tag>
  );
}
